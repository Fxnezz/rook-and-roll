import http from "node:http";
import express from "express";
import cors from "cors";
import { Server, type Socket } from "socket.io";
import { GameRoom } from "./GameRoom.js";
import { cleanChat, containsProfanity } from "./chat.js";
import { RateLimiter, CorrelationTracker } from "./anticheat.js";
import { initPersistence, saveFinishedGame, getUserModeration, auditAdminAction, fileAutomatedReport } from "./persistence.js";
import { getLiveMatchConfig } from "./liveConfig.js";
import { verifyAdminToken } from "./adminAuth.js";
import { registerBoardGameHandlers } from "./boardgames/socketHandlers.js";
import type { BgClientToServer, BgServerToClient } from "./boardgames/protocol.js";
import type {
  ClientToServer,
  Color,
  Identity,
  ServerToClient,
  TimeControlSpec,
} from "./protocol.js";

const CHALLENGE_TTL_MS = 2 * 60_000;

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

const server = http.createServer(app);
const io = new Server<ClientToServer, ServerToClient>(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

// Games Hub (Connect Four / Tic-Tac-Toe / Checkers) lives on its own
// namespace of this SAME server/process — reuses the deployment, CORS
// config, and HTTP upgrade handling, while keeping its typed event map
// separate from chess's.
const boardGamesNsp = io.of("/boardgames") as unknown as import("socket.io").Namespace<
  BgClientToServer,
  BgServerToClient
>;
registerBoardGameHandlers(boardGamesNsp);

// ---- state -----------------------------------------------------------------
const rooms = new Map<string, GameRoom>();
const userRoom = new Map<string, string>(); // userId -> roomId (active game)
const userSocket = new Map<string, string>(); // userId -> socketId
const graceTimers = new Map<string, NodeJS.Timeout>(); // userId -> abandonment timer
const modPauseTimers = new Map<string, NodeJS.Timeout>(); // roomId -> auto-resume timer
const MOD_PAUSE_AUTO_RESUME_MS = 60_000;

interface QueueEntry {
  identity: Identity;
  socketId: string;
  rated: boolean;
  joinedAt: number;
}
const queues = new Map<string, QueueEntry[]>(); // bucket -> entries

interface Challenge {
  id: string;
  fromUserId: string;
  fromSocketId: string;
  fromIdentity: Identity;
  toUserId: string;
  timeControl: TimeControlSpec;
  rated: boolean;
  createdAt: number;
}
const challenges = new Map<string, Challenge>();

const moveLimiter = new RateLimiter(20, 5_000); // 20 moves / 5s per socket
const chatLimiter = new RateLimiter(8, 5_000);
const correlation = new CorrelationTracker();
const kickCooldown = new Map<string, number>(); // userId -> reconnect-allowed timestamp

/**
 * Same "compute broadly, render narrowly" approach as the flagged chat field:
 * suspicion scores are cheap, non-sensitive numbers attached to every
 * game:state broadcast, but the client only ever renders them for the
 * in-game moderator.
 */
function stateFor(room: GameRoom) {
  return {
    ...room.toState(),
    suspicion: { w: correlation.suspicion(room.white.userId), b: correlation.suspicion(room.black.userId) },
  };
}

interface SocketData {
  userId?: string;
  username?: string;
  roomId?: string;
  muted?: boolean;
  isAdmin?: boolean;
  /** In-game moderator (distinct from isAdmin's JWT god-mode) — only usable within a room this account is actually playing in. */
  isModerator?: boolean;
}

function liveGames() {
  return [...rooms.values()]
    .filter((r) => !r.status)
    .map((r) => r.summary((userId) => correlation.suspicion(userId)));
}

// ---- health ----------------------------------------------------------------
app.get("/", (_req, res) => {
  res.json({
    service: "rook-and-roll-realtime",
    status: "ok",
    rooms: rooms.size,
    searching: [...queues.values()].reduce((n, q) => n + q.length, 0),
    // Non-secret diagnostics: is admin god-mode auth configured? (never the value)
    adminSecretSet: Boolean(process.env.ADMIN_JWT_SECRET),
    dbSet: Boolean(process.env.DATABASE_URL),
  });
});

// ---- matchmaking -----------------------------------------------------------
function bucketKey(tc: TimeControlSpec, rated: boolean) {
  return `${tc.id}|${rated ? "rated" : "casual"}`;
}

function ratingBand(waitMs: number, mm: { startBand: number; widenAmount: number; widenIntervalSec: number; maxBand: number }) {
  return Math.min(mm.maxBand, mm.startBand + Math.floor(waitMs / (mm.widenIntervalSec * 1000)) * mm.widenAmount);
}

function tryMatch(
  bucket: string,
  tc: TimeControlSpec,
  rated: boolean,
  mm: { startBand: number; widenAmount: number; widenIntervalSec: number; maxBand: number },
) {
  const q = queues.get(bucket);
  if (!q || q.length < 2) return;
  const now = Date.now();
  for (let i = 0; i < q.length; i++) {
    for (let j = i + 1; j < q.length; j++) {
      const a = q[i];
      const b = q[j];
      const diff = Math.abs(a.identity.rating - b.identity.rating);
      const band = Math.max(ratingBand(now - a.joinedAt, mm), ratingBand(now - b.joinedAt, mm));
      if (diff <= band) {
        q.splice(j, 1);
        q.splice(i, 1);
        void createGame(a, b, tc, rated);
        return tryMatch(bucket, tc, rated, mm); // keep pairing
      }
    }
  }
}

async function createGame(a: QueueEntry, b: QueueEntry, tc: TimeControlSpec, rated: boolean) {
  const [aMod, bMod] = await Promise.all([getUserModeration(a.identity.userId), getUserModeration(b.identity.userId)]);
  const room = new GameRoom(a.identity, b.identity, tc, rated, aMod.isModerator, bMod.isModerator);
  rooms.set(room.id, room);
  userRoom.set(room.white.userId, room.id);
  userRoom.set(room.black.userId, room.id);

  for (const e of [a, b]) {
    const sock = io.sockets.sockets.get(e.socketId);
    if (sock) {
      sock.data.roomId = room.id;
      sock.join(room.id);
      sock.emit("queue:matched", { roomId: room.id });
    }
  }
  room.start();
  io.to(room.id).emit("game:state", stateFor(room));
}

function removeFromQueues(socketId: string) {
  for (const [, q] of queues) {
    const idx = q.findIndex((e) => e.socketId === socketId);
    if (idx >= 0) q.splice(idx, 1);
  }
}

// ---- game end + persistence -----------------------------------------------
async function endGame(room: GameRoom) {
  if (!room.status) return;
  const cfg = await getLiveMatchConfig();
  const saved = room.voided ? null : await saveFinishedGame(room, cfg.kFactorMultiplier);
  const over = { ...room.status, ratingDelta: saved?.ratingDelta ?? undefined, achievements: saved?.achievements };
  io.to(room.id).emit("game:over", over);
  io.to(room.id).emit("game:state", { ...stateFor(room), status: over });
  // auto-flag suspicious play as a report in the same admin queue as player reports
  if (cfg.anticheat.enabled && !room.voided) {
    for (const p of [room.white, room.black]) {
      const s = correlation.suspicion(p.userId);
      if (s > cfg.anticheat.suspicionThreshold) {
        await fileAutomatedReport(
          p.userId,
          "Automated anti-cheat flag",
          `Move-timing suspicion score ${s.toFixed(2)} (threshold ${cfg.anticheat.suspicionThreshold}) in room ${room.id}.`,
        );
      }
    }
  }
  userRoom.delete(room.white.userId);
  userRoom.delete(room.black.userId);
}

// ---- flag / clock sync loop ------------------------------------------------
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status) continue;
    const flagged = room.checkFlag(now);
    if (flagged) {
      room.endByTimeout(flagged);
      void endGame(room);
    }
  }
}, 1000);

// periodic clock broadcast so client clocks stay honest
setInterval(() => {
  for (const room of rooms.values()) {
    if (!room.status) io.to(room.id).emit("clock:sync", room.clockState());
  }
}, 3000);

// cleanup finished rooms after a while
setInterval(() => {
  for (const [id, room] of rooms) {
    if (room.status && Date.now() - room.clockState().updatedAt > 10 * 60_000) rooms.delete(id);
  }
}, 60_000);

// sweep expired/unanswered challenges
setInterval(() => {
  const now = Date.now();
  for (const [id, c] of challenges) {
    if (now - c.createdAt > CHALLENGE_TTL_MS) challenges.delete(id);
  }
}, 30_000);

// ---- socket handlers -------------------------------------------------------
io.on("connection", (socket: Socket<ClientToServer, ServerToClient, Record<string, never>, SocketData>) => {
  socket.on("queue:join", async ({ identity, timeControl, rated }) => {
    const isRated = rated && !identity.guest;
    socket.data.userId = identity.userId;
    socket.data.username = identity.username;
    userSocket.set(identity.userId, socket.id);

    const cfg = await getLiveMatchConfig();
    if (identity.guest && !cfg.allowGuestPlay) {
      socket.emit("error:msg", { message: "Guest play is currently disabled — please sign in." });
      return;
    }
    if (cfg.enabledTimeControls && !cfg.enabledTimeControls.includes(timeControl.id)) {
      socket.emit("error:msg", { message: "This time control is currently disabled." });
      return;
    }

    // Kick cooldown: recently force-disconnected users can't rejoin yet.
    const cd = kickCooldown.get(identity.userId);
    if (cd && cd > Date.now()) {
      socket.emit("error:msg", { message: "You were removed. Try again later." });
      return;
    }

    // Banned users cannot enter matchmaking; muted users can play but not chat.
    const mod = await getUserModeration(identity.userId);
    socket.data.muted = mod.muted;
    socket.data.isModerator = mod.isModerator;
    if (mod.banned) {
      socket.emit("error:msg", { message: "Your account is suspended." });
      return;
    }

    // already in a game? rejoin instead
    const existing = userRoom.get(identity.userId);
    if (existing && rooms.get(existing) && !rooms.get(existing)!.status) {
      socket.emit("queue:matched", { roomId: existing });
      return;
    }

    const bucket = bucketKey(timeControl, isRated);
    const q = queues.get(bucket) ?? [];
    if (!q.some((e) => e.identity.userId === identity.userId)) {
      q.push({ identity, socketId: socket.id, rated: isRated, joinedAt: Date.now() });
    }
    queues.set(bucket, q);
    socket.emit("queue:waiting", { position: q.length, playersSearching: q.length });
    tryMatch(bucket, timeControl, isRated, cfg.matchmaking);
  });

  socket.on("queue:leave", () => removeFromQueues(socket.id));

  // ---- presence + direct friend challenges ---------------------------------
  socket.on("presence:hello", async ({ identity }) => {
    socket.data.userId = identity.userId;
    socket.data.username = identity.username;
    userSocket.set(identity.userId, socket.id);
    // Needed so a moderator can browse mod:liveGames without first joining a
    // queue/room — the only other places socket.data.isModerator gets set.
    const mod = await getUserModeration(identity.userId);
    socket.data.isModerator = mod.isModerator;
  });

  socket.on("presence:query", ({ userIds }) => {
    socket.emit("presence:status", { online: userIds.filter((id) => userSocket.has(id)) });
  });

  socket.on("challenge:send", ({ identity, toUserId, timeControl, rated }) => {
    socket.data.userId = identity.userId;
    socket.data.username = identity.username;
    userSocket.set(identity.userId, socket.id);

    if (userRoom.has(identity.userId)) {
      socket.emit("challenge:error", { message: "Finish your current game first." });
      return;
    }
    if (userRoom.has(toUserId)) {
      socket.emit("challenge:error", { message: "That player is already in a game." });
      return;
    }
    const toSocketId = userSocket.get(toUserId);
    if (!toSocketId) {
      socket.emit("challenge:error", { message: "That player isn't online." });
      return;
    }

    const isRated = rated && !identity.guest;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    challenges.set(id, {
      id,
      fromUserId: identity.userId,
      fromSocketId: socket.id,
      fromIdentity: identity,
      toUserId,
      timeControl,
      rated: isRated,
      createdAt: Date.now(),
    });
    io.to(toSocketId).emit("challenge:received", {
      id,
      from: { userId: identity.userId, username: identity.username, rating: identity.rating },
      timeControl,
      rated: isRated,
    });
  });

  socket.on("challenge:decline", ({ challengeId }) => {
    const c = challenges.get(challengeId);
    if (!c) return;
    challenges.delete(challengeId);
    const fromSock = io.sockets.sockets.get(c.fromSocketId);
    fromSock?.emit("challenge:declined", { challengeId });
  });

  socket.on("challenge:cancel", ({ challengeId }) => {
    const c = challenges.get(challengeId);
    if (!c || c.fromSocketId !== socket.id) return;
    challenges.delete(challengeId);
    const toSock = userSocket.get(c.toUserId);
    if (toSock) io.to(toSock).emit("challenge:cancelled", { challengeId });
  });

  socket.on("challenge:accept", ({ challengeId, identity }) => {
    const c = challenges.get(challengeId);
    if (!c) {
      socket.emit("challenge:error", { challengeId, message: "This challenge is no longer available." });
      return;
    }
    if (c.toUserId !== identity.userId) return;
    if (Date.now() - c.createdAt > CHALLENGE_TTL_MS) {
      challenges.delete(challengeId);
      socket.emit("challenge:error", { challengeId, message: "Challenge expired." });
      return;
    }
    if (userRoom.has(c.fromUserId) || userRoom.has(c.toUserId)) {
      challenges.delete(challengeId);
      socket.emit("challenge:error", { challengeId, message: "One of you is already in a game." });
      return;
    }
    const fromSock = io.sockets.sockets.get(c.fromSocketId);
    if (!fromSock) {
      challenges.delete(challengeId);
      socket.emit("challenge:error", { challengeId, message: "The challenger is no longer connected." });
      return;
    }

    challenges.delete(challengeId);
    socket.data.userId = identity.userId;
    socket.data.username = identity.username;
    userSocket.set(identity.userId, socket.id);

    void createGame(
      { identity: c.fromIdentity, socketId: c.fromSocketId, rated: c.rated, joinedAt: Date.now() },
      { identity, socketId: socket.id, rated: c.rated, joinedAt: Date.now() },
      c.timeControl,
      c.rated,
    );
  });

  socket.on("room:join", async ({ roomId, identity }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:msg", { message: "Room not found" });
    socket.data.userId = identity.userId;
    socket.data.username = identity.username;
    socket.data.roomId = roomId;
    userSocket.set(identity.userId, socket.id);
    {
      const mod = await getUserModeration(identity.userId);
      socket.data.muted = mod.muted;
      socket.data.isModerator = mod.isModerator;
    }
    socket.join(roomId);

    const color = room.playerColor(identity.userId);
    if (color) {
      // player (re)connecting
      const t = graceTimers.get(identity.userId);
      if (t) {
        clearTimeout(t);
        graceTimers.delete(identity.userId);
        socket.to(roomId).emit("opponent:reconnected");
      }
      room.setConnected(identity.userId, true);
    } else {
      room.spectators.add(socket.id);
    }
    socket.emit("game:state", stateFor(room));
  });

  socket.on("room:spectate", async ({ roomId, identity }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:msg", { message: "Room not found" });
    const cfg = await getLiveMatchConfig();
    if (!cfg.allowSpectators) return socket.emit("error:msg", { message: "Spectating is currently disabled." });
    socket.data.roomId = roomId;
    socket.data.userId = identity.userId;
    socket.data.username = identity.username;
    socket.data.isModerator = (await getUserModeration(identity.userId)).isModerator;
    socket.join(roomId);
    room.spectators.add(socket.id);
    room.spectatorIdentities.set(socket.id, { userId: identity.userId, username: identity.username });
    socket.emit("game:state", stateFor(room));
    io.to(roomId).emit("game:state", stateFor(room));
  });

  socket.on("room:leave", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.spectators.delete(socket.id);
      room.spectatorIdentities.delete(socket.id);
    }
    socket.leave(roomId);
  });

  socket.on("move", async ({ roomId, from, to, promotion }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const userId = socket.data.userId;
    if (!userId) return;
    const color = room.playerColor(userId);
    if (!color) return socket.emit("error:msg", { message: "You are not a player in this game" });
    if (!moveLimiter.allow(socket.id)) return socket.emit("error:msg", { message: "Slow down" });

    const res = room.applyMove(color, from, to, promotion);
    if (!res.ok) {
      socket.emit("error:msg", { message: res.error });
      // resend authoritative state so the client can roll back
      socket.emit("game:state", stateFor(room));
      if (room.status) void endGame(room);
      return;
    }
    correlation.record(userId);
    const movePayload = { san: res.san, from, to, promotion, clock: room.clockState() };
    const wSock = userSocket.get(room.white.userId);
    const bSock = userSocket.get(room.black.userId);
    for (const sid of [wSock, bSock, ...room.adminObservers]) {
      if (sid) io.to(sid).emit("game:move", movePayload);
    }
    const cfg = await getLiveMatchConfig();
    const delayMs = cfg.spectatorBroadcastDelaySec * 1000;
    const spectatorIds = [...room.spectators].filter((sid) => sid !== wSock && sid !== bSock);
    if (delayMs > 0) {
      setTimeout(() => {
        for (const sid of spectatorIds) io.to(sid).emit("game:move", movePayload);
      }, delayMs);
    } else {
      for (const sid of spectatorIds) io.to(sid).emit("game:move", movePayload);
    }
    if (room.status) void endGame(room);
  });

  socket.on("resign", ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;
    if (!room || !userId) return;
    const color = room.playerColor(userId);
    if (!color) return;
    room.resign(color);
    void endGame(room);
  });

  socket.on("abort", ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;
    if (!room || !userId) return;
    const color = room.playerColor(userId);
    if (!color) return;
    if (room.abort()) void endGame(room);
  });

  socket.on("draw:offer", ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;
    if (!room || !userId || room.status) return;
    const color = room.playerColor(userId);
    if (!color) return;
    room.drawOfferFrom = color;
    socket.to(roomId).emit("draw:offered", { from: color });
  });

  socket.on("draw:accept", ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;
    if (!room || !userId || room.status || !room.drawOfferFrom) return;
    const color = room.playerColor(userId);
    if (!color || color === room.drawOfferFrom) return; // can't accept your own
    room.agreeDraw();
    void endGame(room);
  });

  socket.on("draw:decline", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.drawOfferFrom = null;
    socket.to(roomId).emit("draw:declined");
  });

  socket.on("takeback:offer", ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;
    if (!room || !userId || room.status) return;
    const color = room.playerColor(userId);
    if (!color) return;
    room.takebackOfferFrom = color;
    socket.to(roomId).emit("takeback:offered", { from: color });
  });

  socket.on("takeback:accept", ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;
    if (!room || !userId || room.status || !room.takebackOfferFrom) return;
    const color = room.playerColor(userId);
    if (!color || color === room.takebackOfferFrom) return; // can't accept your own
    if (room.takeback(room.takebackOfferFrom)) {
      io.to(roomId).emit("game:state", stateFor(room));
    }
  });

  socket.on("takeback:decline", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.takebackOfferFrom = null;
    socket.to(roomId).emit("takeback:declined");
  });

  // rematch offers tracked per room in memory
  const rematchOffers = (roomId: string) => {
    const r = rooms.get(roomId) as (GameRoom & { _rematch?: Set<string> }) | undefined;
    if (!r) return null;
    if (!r._rematch) r._rematch = new Set();
    return r._rematch;
  };

  socket.on("rematch:offer", ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;
    if (!room || !userId || !room.status) return;
    const color = room.playerColor(userId);
    if (!color) return;
    const offers = rematchOffers(roomId)!;
    offers.add(color);
    socket.to(roomId).emit("rematch:offered", { from: color });
    if (offers.has("w") && offers.has("b")) startRematch(room);
  });

  socket.on("rematch:accept", ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;
    if (!room || !userId) return;
    const color = room.playerColor(userId);
    if (!color) return;
    const offers = rematchOffers(roomId)!;
    offers.add(color);
    socket.to(roomId).emit("rematch:offered", { from: color });
    if (offers.has("w") && offers.has("b")) startRematch(room);
  });

  socket.on("chat:send", async ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (socket.data.muted) return; // muted users can play but not chat
    const userId = socket.data.userId;
    const color = userId ? room.playerColor(userId) : null;
    if (color && room.roomMuted[color]) return; // moderator muted this side for this game
    const cfg = await getLiveMatchConfig();
    if (!cfg.allowChat) return;
    if (!chatLimiter.allow(socket.id)) return;
    const clean = cleanChat(text);
    if (!clean) return;
    io.to(roomId).emit("chat:message", {
      from: socket.data.username ?? "Anon",
      text: clean,
      ts: Date.now(),
      fromSpectator: !color,
      flagged: containsProfanity(text),
    });
  });

  // ---- admin god-mode ------------------------------------------------------
  // The admin token is cryptographically verified before isAdmin is set; every
  // admin:* handler re-checks socket.data.isAdmin (which the client cannot set).
  socket.on("admin:hello", async ({ token }) => {
    if (await verifyAdminToken(token)) {
      socket.data.isAdmin = true;
      socket.emit("admin:ok", { games: liveGames() });
    } else {
      socket.data.isAdmin = false;
      socket.emit("admin:denied");
    }
  });

  const adminRoom = (roomId: string): GameRoom | null =>
    socket.data.isAdmin ? rooms.get(roomId) ?? null : null;

  const resync = (room: GameRoom) => io.to(room.id).emit("game:state", stateFor(room));

  /** Best-effort audit trail for every admin:* action, gated by the config toggle. */
  const logAdmin = async (action: string, targetId?: string, detail?: Record<string, unknown>, targetType = "game") => {
    const cfg = await getLiveMatchConfig();
    if (cfg.logAdminSocketActions) await auditAdminAction(action, targetType, targetId, detail);
  };

  // ---- in-game moderator (distinct from admin god-mode) ---------------------
  // socket.data.isModerator is a cached DB lookup the client cannot set, and
  // every mod:* handler additionally requires the caller to be one of the two
  // players OR a spectator in the room they're targeting — never cross-room,
  // unlike admin. When actually playing, myColor is set and the "other side"
  // is inferred automatically (the client's targetColor is ignored for
  // safety, so a player can never target themselves). When spectating,
  // myColor is null and the client must explicitly pass a validated
  // targetColor since there's no "opponent" to infer.
  const modRoom = (roomId: string): { room: GameRoom; myColor: Color | null } | null => {
    if (!socket.data.isModerator) return null;
    const room = rooms.get(roomId);
    if (!room) return null;
    const myColor = socket.data.userId ? room.playerColor(socket.data.userId) : null;
    if (myColor) return { room, myColor };
    if (room.spectators.has(socket.id)) return { room, myColor: null };
    return null;
  };

  const resolveModTarget = (ctx: { myColor: Color | null }, targetColor?: Color): Color | null => {
    if (ctx.myColor) return ctx.myColor === "w" ? "b" : "w";
    return targetColor === "w" || targetColor === "b" ? targetColor : null;
  };

  socket.on("mod:muteChat", ({ roomId, muted, targetColor }) => {
    const ctx = modRoom(roomId);
    if (!ctx) return;
    const target = resolveModTarget(ctx, targetColor);
    if (!target) return;
    ctx.room.adminMuteChat(target, muted);
    resync(ctx.room);
  });

  // Private — delivered only to the opponent's own socket, never broadcast to
  // the room (unlike admin:whisper, which is visible to admin observers too).
  socket.on("mod:warn", ({ roomId, text, targetColor }) => {
    const ctx = modRoom(roomId);
    if (!ctx) return;
    const target = resolveModTarget(ctx, targetColor);
    if (!target) return;
    const clean = String(text).trim().slice(0, 300);
    if (!clean) return;
    const targetUserId = target === "w" ? ctx.room.white.userId : ctx.room.black.userId;
    const targetSocketId = userSocket.get(targetUserId);
    const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : undefined;
    targetSocket?.emit("chat:message", { from: "Moderator", text: clean, ts: Date.now(), system: true });
  });

  // Scoped pause — unlike admin:pause this always auto-resumes, so a
  // moderator can never accidentally freeze someone's game indefinitely.
  socket.on("mod:pause", ({ roomId, paused }) => {
    const ctx = modRoom(roomId);
    if (!ctx) return;
    const existing = modPauseTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      modPauseTimers.delete(roomId);
    }
    ctx.room.adminPause(paused);
    resync(ctx.room);
    if (paused) {
      const timer = setTimeout(() => {
        modPauseTimers.delete(roomId);
        const r = rooms.get(roomId);
        if (r && r.paused) {
          r.adminPause(false);
          io.to(roomId).emit("game:state", stateFor(r));
        }
      }, MOD_PAUSE_AUTO_RESUME_MS);
      modPauseTimers.set(roomId, timer);
    }
  });

  socket.on("mod:flagReview", ({ roomId, flagged }) => {
    const ctx = modRoom(roomId);
    if (!ctx) return;
    ctx.room.adminFlagReview(flagged);
    resync(ctx.room);
  });

  // Read-only live games list for the in-game moderator to spectate any
  // public room — a narrower, non-admin-JWT-gated sibling of admin:games.
  socket.on("mod:liveGames", () => {
    if (!socket.data.isModerator) return;
    socket.emit("mod:liveGames", { games: liveGames() });
  });

  socket.on("admin:games", () => {
    if (!socket.data.isAdmin) return;
    socket.emit("admin:games", { games: liveGames() });
  });

  // Invisible spectate: join the room without appearing in the spectator count
  // or player list.
  socket.on("admin:attach", async ({ roomId }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    socket.join(roomId);
    room.adminObservers.add(socket.id);
    socket.emit("game:state", stateFor(room));
    void logAdmin("admin_attach", roomId);
    const cfg = await getLiveMatchConfig();
    if (cfg.notifyPlayersOnAdminAttach) {
      io.to(roomId).emit("chat:message", { from: "System", text: "A moderator has joined to observe this game.", ts: Date.now(), system: true });
    }
  });

  socket.on("admin:setFen", ({ roomId, fen }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    if (room.adminSetFen(fen)) {
      resync(room);
      void logAdmin("game_set_fen", roomId, { fen });
    }
  });

  socket.on("admin:place", ({ roomId, square, piece }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminPlace(square, piece);
    resync(room);
    void logAdmin("game_place_piece", roomId, { square, piece });
  });

  socket.on("admin:forceMove", ({ roomId, from, to, promotion }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminForceMove(from, to, promotion);
    io.to(roomId).emit("game:move", { san: `${from}${to}`, from, to, promotion, clock: room.clockState() });
    resync(room);
    void logAdmin("game_force_move", roomId, { from, to, promotion });
  });

  socket.on("admin:forceResult", ({ roomId, result }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminForceResult(result);
    void endGame(room);
    void logAdmin("game_force_result", roomId, { result });
  });

  socket.on("admin:clock", ({ roomId, color, addSeconds, pause, disable }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminClock(color, { addSeconds, pause, disable });
    resync(room);
    void logAdmin("game_clock", roomId, { color, addSeconds, pause, disable });
  });

  socket.on("admin:freeze", ({ roomId, color, frozen }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminFreeze(color, frozen);
    resync(room);
    void logAdmin("game_freeze", roomId, { color, frozen });
  });

  socket.on("admin:swap", ({ roomId }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminSwap();
    resync(room);
    void logAdmin("game_swap_sides", roomId);
  });

  socket.on("admin:clearChat", ({ roomId }) => {
    if (!socket.data.isAdmin) return;
    io.to(roomId).emit("chat:cleared");
    void logAdmin("game_clear_chat", roomId);
  });

  socket.on("admin:kick", ({ userId, cooldownMs, message }) => {
    if (!socket.data.isAdmin) return;
    if (cooldownMs && cooldownMs > 0) kickCooldown.set(userId, Date.now() + cooldownMs);
    const sid = userSocket.get(userId);
    const target = sid ? io.sockets.sockets.get(sid) : undefined;
    if (target) {
      target.emit("kicked", { message: message ?? "You have been disconnected by a moderator." });
      target.disconnect(true);
    }
    void logAdmin("user_kick_live", userId, { cooldownMs, message }, "user");
  });

  socket.on("admin:systemMessage", ({ roomId, text }) => {
    if (!socket.data.isAdmin) return;
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    io.to(roomId).emit("chat:message", { from: "Moderator", text: clean, ts: Date.now(), system: true });
    void logAdmin("game_system_message", roomId, { text: clean });
  });

  socket.on("admin:whisper", ({ roomId, color, text }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    const target = color === "w" ? room.white : room.black;
    const sid = userSocket.get(target.userId);
    if (sid) io.to(sid).emit("chat:message", { from: "Moderator (private)", text: clean, ts: Date.now(), system: true });
    void logAdmin("game_whisper", roomId, { color, text: clean });
  });

  socket.on("admin:pause", ({ roomId, paused }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminPause(paused);
    resync(room);
    io.to(roomId).emit("chat:message", {
      from: "System",
      text: paused ? "Game paused by a moderator." : "Game resumed.",
      ts: Date.now(),
      system: true,
    });
    void logAdmin(paused ? "game_pause" : "game_resume", roomId);
  });

  socket.on("admin:void", ({ roomId, reason }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminVoid(reason);
    void endGame(room);
    void logAdmin("game_void", roomId, { reason });
  });

  socket.on("admin:muteChat", ({ roomId, color, muted }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminMuteChat(color, muted);
    resync(room);
    void logAdmin(muted ? "game_mute_chat" : "game_unmute_chat", roomId, { color });
  });

  socket.on("admin:extendBoth", ({ roomId, addSeconds }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminExtendBoth(addSeconds);
    resync(room);
    void logAdmin("game_extend_both", roomId, { addSeconds });
  });

  socket.on("admin:resetClocks", ({ roomId }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminResetClocks();
    resync(room);
    void logAdmin("game_reset_clocks", roomId);
  });

  socket.on("admin:forceRematch", ({ roomId }) => {
    const room = adminRoom(roomId);
    if (!room || !room.status) return;
    startRematch(room);
    void logAdmin("game_force_rematch", roomId);
  });

  socket.on("admin:cancelGame", ({ roomId }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    for (const p of [room.white, room.black]) {
      const sid = userSocket.get(p.userId);
      const target = sid ? io.sockets.sockets.get(sid) : undefined;
      if (target) target.emit("kicked", { message: "This game was cancelled by a moderator." });
    }
    userRoom.delete(room.white.userId);
    userRoom.delete(room.black.userId);
    rooms.delete(roomId);
    io.to(roomId).emit("admin:games", { games: liveGames() });
    void logAdmin("game_cancel", roomId);
  });

  socket.on("admin:flagReview", ({ roomId, flagged }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminFlagReview(flagged);
    void logAdmin(flagged ? "game_flag_review" : "game_unflag_review", roomId);
  });

  socket.on("disconnect", async () => {
    removeFromQueues(socket.id);
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;
    if (userId) userSocket.delete(userId);
    for (const [id, c] of challenges) {
      if (c.fromSocketId === socket.id) {
        challenges.delete(id);
        const toSock = userSocket.get(c.toUserId);
        if (toSock) io.to(toSock).emit("challenge:cancelled", { challengeId: id });
      }
    }
    if (socket.data.isAdmin) {
      for (const room of rooms.values()) room.adminObservers.delete(socket.id);
    }
    if (!roomId || !userId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.spectators.delete(socket.id);
    room.spectatorIdentities.delete(socket.id);
    const color = room.playerColor(userId);
    if (!color || room.status) return;
    room.setConnected(userId, false);
    const cfg = await getLiveMatchConfig();
    const graceMs = cfg.disconnectGraceSec * 1000;
    socket.to(roomId).emit("opponent:disconnected", { graceMs });
    const timer = setTimeout(() => {
      if (!room.status) {
        room.abandonment(color);
        void endGame(room);
      }
      graceTimers.delete(userId);
    }, graceMs);
    graceTimers.set(userId, timer);
  });

  function startRematch(prev: GameRoom) {
    const wSock = userSocket.get(prev.white.userId);
    const bSock = userSocket.get(prev.black.userId);
    // swap colors for the rematch
    const next = new GameRoom(
      { userId: prev.black.userId, username: prev.black.username, rating: prev.black.rating, guest: prev.black.userId.startsWith("guest:") },
      { userId: prev.white.userId, username: prev.white.username, rating: prev.white.rating, guest: prev.white.userId.startsWith("guest:") },
      prev.timeControl,
      prev.rated,
      prev.black.isModerator,
      prev.white.isModerator,
    );
    rooms.set(next.id, next);
    userRoom.set(next.white.userId, next.id);
    userRoom.set(next.black.userId, next.id);
    for (const sid of [wSock, bSock]) {
      if (!sid) continue;
      const s = io.sockets.sockets.get(sid);
      if (s) {
        s.data.roomId = next.id;
        s.join(next.id);
      }
    }
    next.start();
    io.to(next.id).emit("rematch:ready", { roomId: next.id });
    io.to(next.id).emit("game:state", stateFor(next));
  }
});

initPersistence().finally(() => {
  server.listen(PORT, () => {
    console.log(`▲ Rook & Roll realtime server on :${PORT}`);
    console.log(`  CORS origins: ${CLIENT_ORIGIN.join(", ")}`);
  });
});
