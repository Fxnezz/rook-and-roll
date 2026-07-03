import http from "node:http";
import express from "express";
import cors from "cors";
import { Server, type Socket } from "socket.io";
import { GameRoom } from "./GameRoom.js";
import { cleanChat } from "./chat.js";
import { RateLimiter, CorrelationTracker } from "./anticheat.js";
import { initPersistence, saveFinishedGame, getUserModeration } from "./persistence.js";
import { verifyAdminToken } from "./adminAuth.js";
import { registerBoardGameHandlers } from "./boardgames/socketHandlers.js";
import type { BgClientToServer, BgServerToClient } from "./boardgames/protocol.js";
import type {
  ClientToServer,
  Identity,
  ServerToClient,
  TimeControlSpec,
} from "./protocol.js";

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());
const GRACE_MS = 30_000;

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

interface QueueEntry {
  identity: Identity;
  socketId: string;
  rated: boolean;
  joinedAt: number;
}
const queues = new Map<string, QueueEntry[]>(); // bucket -> entries

const moveLimiter = new RateLimiter(20, 5_000); // 20 moves / 5s per socket
const chatLimiter = new RateLimiter(8, 5_000);
const correlation = new CorrelationTracker();
const kickCooldown = new Map<string, number>(); // userId -> reconnect-allowed timestamp

interface SocketData {
  userId?: string;
  username?: string;
  roomId?: string;
  muted?: boolean;
  isAdmin?: boolean;
}

function liveGames() {
  return [...rooms.values()].filter((r) => !r.status).map((r) => r.summary());
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

function ratingBand(waitMs: number) {
  // start ±100, widen by 100 every 5s, cap ±1000
  return Math.min(1000, 100 + Math.floor(waitMs / 5000) * 100);
}

function tryMatch(bucket: string, tc: TimeControlSpec, rated: boolean) {
  const q = queues.get(bucket);
  if (!q || q.length < 2) return;
  const now = Date.now();
  for (let i = 0; i < q.length; i++) {
    for (let j = i + 1; j < q.length; j++) {
      const a = q[i];
      const b = q[j];
      const diff = Math.abs(a.identity.rating - b.identity.rating);
      const band = Math.max(ratingBand(now - a.joinedAt), ratingBand(now - b.joinedAt));
      if (diff <= band) {
        q.splice(j, 1);
        q.splice(i, 1);
        createGame(a, b, tc, rated);
        return tryMatch(bucket, tc, rated); // keep pairing
      }
    }
  }
}

function createGame(a: QueueEntry, b: QueueEntry, tc: TimeControlSpec, rated: boolean) {
  const room = new GameRoom(a.identity, b.identity, tc, rated);
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
  io.to(room.id).emit("game:state", room.toState());
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
  const deltas = await saveFinishedGame(room);
  const over = { ...room.status, ratingDelta: deltas ?? undefined };
  io.to(room.id).emit("game:over", over);
  io.to(room.id).emit("game:state", { ...room.toState(), status: over });
  // review flag for suspicious play
  for (const p of [room.white, room.black]) {
    const s = correlation.suspicion(p.userId);
    if (s > 0.6) console.warn(`[anticheat] review ${p.username} (${p.userId}) suspicion=${s.toFixed(2)} room=${room.id}`);
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

// ---- socket handlers -------------------------------------------------------
io.on("connection", (socket: Socket<ClientToServer, ServerToClient, Record<string, never>, SocketData>) => {
  socket.on("queue:join", async ({ identity, timeControl, rated }) => {
    const isRated = rated && !identity.guest;
    socket.data.userId = identity.userId;
    socket.data.username = identity.username;
    userSocket.set(identity.userId, socket.id);

    // Kick cooldown: recently force-disconnected users can't rejoin yet.
    const cd = kickCooldown.get(identity.userId);
    if (cd && cd > Date.now()) {
      socket.emit("error:msg", { message: "You were removed. Try again later." });
      return;
    }

    // Banned users cannot enter matchmaking; muted users can play but not chat.
    const mod = await getUserModeration(identity.userId);
    socket.data.muted = mod.muted;
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
    tryMatch(bucket, timeControl, isRated);
  });

  socket.on("queue:leave", () => removeFromQueues(socket.id));

  socket.on("room:join", async ({ roomId, identity }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:msg", { message: "Room not found" });
    socket.data.userId = identity.userId;
    socket.data.username = identity.username;
    socket.data.roomId = roomId;
    userSocket.set(identity.userId, socket.id);
    socket.data.muted = (await getUserModeration(identity.userId)).muted;
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
    socket.emit("game:state", room.toState());
  });

  socket.on("room:spectate", ({ roomId, identity }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:msg", { message: "Room not found" });
    socket.data.roomId = roomId;
    socket.data.userId = identity.userId;
    socket.join(roomId);
    room.spectators.add(socket.id);
    socket.emit("game:state", room.toState());
    io.to(roomId).emit("game:state", room.toState());
  });

  socket.on("room:leave", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) room.spectators.delete(socket.id);
    socket.leave(roomId);
  });

  socket.on("move", ({ roomId, from, to, promotion }) => {
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
      socket.emit("game:state", room.toState());
      if (room.status) void endGame(room);
      return;
    }
    correlation.record(userId);
    io.to(roomId).emit("game:move", { san: res.san, from, to, promotion, clock: room.clockState() });
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

  socket.on("chat:send", ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (socket.data.muted) return; // muted users can play but not chat
    if (!chatLimiter.allow(socket.id)) return;
    const clean = cleanChat(text);
    if (!clean) return;
    io.to(roomId).emit("chat:message", {
      from: socket.data.username ?? "Anon",
      text: clean,
      ts: Date.now(),
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

  const resync = (room: GameRoom) => io.to(room.id).emit("game:state", room.toState());

  socket.on("admin:games", () => {
    if (!socket.data.isAdmin) return;
    socket.emit("admin:games", { games: liveGames() });
  });

  // Invisible spectate: join the room without appearing in the spectator count
  // or player list.
  socket.on("admin:attach", ({ roomId }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    socket.join(roomId);
    socket.emit("game:state", room.toState());
  });

  socket.on("admin:setFen", ({ roomId, fen }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    if (room.adminSetFen(fen)) resync(room);
  });

  socket.on("admin:place", ({ roomId, square, piece }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminPlace(square, piece);
    resync(room);
  });

  socket.on("admin:forceMove", ({ roomId, from, to, promotion }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminForceMove(from, to, promotion);
    io.to(roomId).emit("game:move", { san: `${from}${to}`, from, to, promotion, clock: room.clockState() });
    resync(room);
  });

  socket.on("admin:forceResult", ({ roomId, result }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminForceResult(result);
    void endGame(room);
  });

  socket.on("admin:clock", ({ roomId, color, addSeconds, pause, disable }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminClock(color, { addSeconds, pause, disable });
    resync(room);
  });

  socket.on("admin:freeze", ({ roomId, color, frozen }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminFreeze(color, frozen);
    resync(room);
  });

  socket.on("admin:swap", ({ roomId }) => {
    const room = adminRoom(roomId);
    if (!room) return;
    room.adminSwap();
    resync(room);
  });

  socket.on("admin:clearChat", ({ roomId }) => {
    if (!socket.data.isAdmin) return;
    io.to(roomId).emit("chat:cleared");
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
  });

  socket.on("disconnect", () => {
    removeFromQueues(socket.id);
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;
    if (userId) userSocket.delete(userId);
    if (!roomId || !userId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.spectators.delete(socket.id);
    const color = room.playerColor(userId);
    if (!color || room.status) return;
    room.setConnected(userId, false);
    socket.to(roomId).emit("opponent:disconnected", { graceMs: GRACE_MS });
    const timer = setTimeout(() => {
      if (!room.status) {
        room.abandonment(color);
        void endGame(room);
      }
      graceTimers.delete(userId);
    }, GRACE_MS);
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
    io.to(next.id).emit("game:state", next.toState());
  }
});

initPersistence().finally(() => {
  server.listen(PORT, () => {
    console.log(`▲ Rook & Roll realtime server on :${PORT}`);
    console.log(`  CORS origins: ${CLIENT_ORIGIN.join(", ")}`);
  });
});
