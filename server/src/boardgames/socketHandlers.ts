import type { Namespace, Socket } from "socket.io";
import { RateLimiter } from "../anticheat.js";
import { cleanChat } from "../chat.js";
import { getUserModeration } from "../persistence.js";
import { verifyAdminToken } from "../adminAuth.js";
import { saveBoardGameResult } from "./persistence.js";
import { MatchRoom, tryMatchQueue, type BgIdentity, type BgQueueEntry } from "./MatchRoom.js";
import { ticTacToeEngine } from "./ticTacToe.js";
import { connectFourEngine } from "./connectFour.js";
import { checkersEngine } from "./checkers.js";
import type { GameEngine } from "./engine.js";
import type { BgClientToServer, BgLiveRoomSummary, BgServerToClient, GameKind } from "./protocol.js";

const ENGINES: Record<GameKind, GameEngine<unknown, unknown>> = {
  tictactoe: ticTacToeEngine as GameEngine<unknown, unknown>,
  connect4: connectFourEngine as GameEngine<unknown, unknown>,
  checkers: checkersEngine as GameEngine<unknown, unknown>,
};

const GRACE_MS = 30_000;

interface SocketData {
  userId?: string;
  username?: string;
  roomId?: string;
  muted?: boolean;
  isAdmin?: boolean;
}

type BgNamespace = Namespace<BgClientToServer, BgServerToClient>;
type BgSocket = Socket<BgClientToServer, BgServerToClient, Record<string, never>, SocketData>;

const rooms = new Map<string, MatchRoom<unknown, unknown>>();
const userRoom = new Map<string, string>();
const userSocket = new Map<string, string>();
const graceTimers = new Map<string, NodeJS.Timeout>();
const queues = new Map<string, BgQueueEntry[]>(); // `${kind}|${rated}` -> entries
const invites = new Map<string, { kind: GameKind; identity: BgIdentity; socketId: string }>();
const finishedAt = new Map<string, number>(); // roomId -> when it finished, for TTL sweep
const kickCooldown = new Map<string, number>(); // userId -> reconnect-allowed timestamp

function liveBoardGames(): BgLiveRoomSummary[] {
  return [...rooms.values()]
    .filter((r) => !r.status)
    .map((r) => ({
      roomId: r.id,
      kind: r.kind as GameKind,
      a: r.a.username,
      aUserId: r.a.userId,
      b: r.b.username,
      bUserId: r.b.userId,
      moveCount: r.moves.length,
      spectators: r.spectators.size,
      over: Boolean(r.status),
    }));
}

const moveLimiter = new RateLimiter(30, 5_000);
const chatLimiter = new RateLimiter(8, 5_000);

function bucketKey(kind: GameKind, rated: boolean) {
  return `${kind}|${rated ? "rated" : "casual"}`;
}

function inviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function registerBoardGameHandlers(nsp: BgNamespace) {
  function resync(room: MatchRoom<unknown, unknown>) {
    nsp.to(room.id).emit("game:state", {
      ...room.toState(),
      kind: room.kind as GameKind,
    });
  }

  async function endGame(room: MatchRoom<unknown, unknown>) {
    if (!room.status) return;
    const deltas = await saveBoardGameResult(room.kind, room);
    const payload = { ...room.status, ratingDelta: deltas ?? undefined };
    nsp.to(room.id).emit("game:over", payload);
    resync(room);
    userRoom.delete(room.a.userId);
    userRoom.delete(room.b.userId);
    finishedAt.set(room.id, Date.now());
  }

  function createRoom(kind: GameKind, x: BgQueueEntry, y: BgQueueEntry, rated: boolean) {
    const engine = ENGINES[kind];
    const room = new MatchRoom(engine, x.identity, y.identity, rated);
    rooms.set(room.id, room);
    userRoom.set(room.a.userId, room.id);
    userRoom.set(room.b.userId, room.id);
    for (const e of [x, y]) {
      const sock = nsp.sockets.get(e.socketId);
      if (sock) {
        sock.data.roomId = room.id;
        sock.join(room.id);
        sock.emit("queue:matched", { roomId: room.id });
      }
    }
    resync(room);
  }

  function removeFromQueues(socketId: string) {
    for (const [, q] of queues) {
      const idx = q.findIndex((e) => e.socketId === socketId);
      if (idx >= 0) q.splice(idx, 1);
    }
  }

  // Drop finished rooms 10 minutes after they end (keeps them around briefly
  // for late resyncs/rematch, without leaking memory forever).
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [id, at] of finishedAt) {
      if (at < cutoff) {
        rooms.delete(id);
        finishedAt.delete(id);
      }
    }
  }, 60_000);

  nsp.on("connection", (socket: BgSocket) => {
    socket.on("queue:join", ({ kind, identity, rated }) => {
      if (!ENGINES[kind]) return;
      const isRated = rated && !identity.guest && kind !== "tictactoe";
      socket.data.userId = identity.userId;
      socket.data.username = identity.username;
      userSocket.set(identity.userId, socket.id);

      // Kick cooldown: recently force-disconnected users can't rejoin yet.
      const cd = kickCooldown.get(identity.userId);
      if (cd && cd > Date.now()) {
        socket.emit("error:msg", { message: "You were removed. Try again later." });
        return;
      }

      const existingRoom = userRoom.get(identity.userId);
      if (existingRoom && rooms.get(existingRoom) && !rooms.get(existingRoom)!.status) {
        socket.emit("queue:matched", { roomId: existingRoom });
        return;
      }

      const key = bucketKey(kind, isRated);
      const q = queues.get(key) ?? [];
      if (!q.some((e) => e.identity.userId === identity.userId)) {
        q.push({ identity, socketId: socket.id, rated: isRated, joinedAt: Date.now() });
      }
      queues.set(key, q);
      socket.emit("queue:waiting", { position: q.length });
      tryMatchQueue(q, (x, y) => createRoom(kind, x, y, isRated));
    });

    socket.on("queue:leave", () => removeFromQueues(socket.id));

    socket.on("invite:create", ({ kind, identity }) => {
      if (!ENGINES[kind]) return;
      const code = inviteCode();
      invites.set(code, { kind, identity, socketId: socket.id });
      socket.data.userId = identity.userId;
      userSocket.set(identity.userId, socket.id);
      socket.emit("invite:created", { code });
      // invites expire after 10 minutes if unused
      setTimeout(() => invites.delete(code), 10 * 60_000);
    });

    socket.on("invite:join", ({ code, identity }) => {
      const inv = invites.get(code.toUpperCase());
      if (!inv) return socket.emit("invite:error", { message: "That invite code is invalid or expired." });
      invites.delete(code.toUpperCase());
      socket.data.userId = identity.userId;
      userSocket.set(identity.userId, socket.id);
      const hostEntry: BgQueueEntry = {
        identity: inv.identity,
        socketId: inv.socketId,
        rated: false,
        joinedAt: Date.now(),
      };
      const guestEntry: BgQueueEntry = { identity, socketId: socket.id, rated: false, joinedAt: Date.now() };
      createRoom(inv.kind, hostEntry, guestEntry, false);
    });

    socket.on("room:join", ({ roomId, identity }) => {
      const room = rooms.get(roomId);
      if (!room) return socket.emit("error:msg", { message: "Room not found" });
      socket.data.userId = identity.userId;
      socket.data.username = identity.username;
      socket.data.roomId = roomId;
      userSocket.set(identity.userId, socket.id);
      socket.join(roomId);

      const seat = room.playerSeat(identity.userId);
      if (seat) {
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
      socket.emit("game:state", { ...room.toState(), kind: room.kind as GameKind });
    });

    socket.on("room:spectate", ({ roomId, identity }) => {
      const room = rooms.get(roomId);
      if (!room) return socket.emit("error:msg", { message: "Room not found" });
      socket.data.roomId = roomId;
      socket.data.userId = identity.userId;
      socket.join(roomId);
      room.spectators.add(socket.id);
      resync(room);
    });

    socket.on("room:leave", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) room.spectators.delete(socket.id);
      socket.leave(roomId);
    });

    socket.on("move", async ({ roomId, move }) => {
      const room = rooms.get(roomId);
      const userId = socket.data.userId;
      if (!room || !userId) return;
      const seat = room.playerSeat(userId);
      if (!seat) return socket.emit("error:msg", { message: "You are not a player in this game" });
      if (!moveLimiter.allow(socket.id)) return socket.emit("error:msg", { message: "Slow down" });

      const mod = await getUserModeration(userId);
      if (mod.banned) return socket.emit("error:msg", { message: "Your account is suspended." });

      const res = room.applyMove(seat, move);
      if (!res.ok) {
        socket.emit("error:msg", { message: res.error });
        socket.emit("game:state", { ...room.toState(), kind: room.kind as GameKind });
        return;
      }
      nsp.to(roomId).emit("game:move", { move, notation: res.notation, by: seat });
      // Always resync full state after a move: unlike chess, these clients
      // don't replay moves through their own copy of the rules engine, so
      // "game:move" alone would leave the board/turn stale until the next
      // full state broadcast (which otherwise only happened at game end).
      resync(room);
      if (room.status) void endGame(room);
    });

    socket.on("resign", ({ roomId }) => {
      const room = rooms.get(roomId);
      const userId = socket.data.userId;
      if (!room || !userId) return;
      const seat = room.playerSeat(userId);
      if (!seat) return;
      room.resign(seat);
      void endGame(room);
    });

    socket.on("draw:offer", ({ roomId }) => {
      const room = rooms.get(roomId);
      const userId = socket.data.userId;
      if (!room || !userId || room.status) return;
      const seat = room.playerSeat(userId);
      if (!seat) return;
      room.drawOfferFrom = seat;
      socket.to(roomId).emit("draw:offered", { from: seat });
    });

    socket.on("draw:accept", ({ roomId }) => {
      const room = rooms.get(roomId);
      const userId = socket.data.userId;
      if (!room || !userId || room.status || !room.drawOfferFrom) return;
      const seat = room.playerSeat(userId);
      if (!seat || seat === room.drawOfferFrom) return;
      room.agreeDraw();
      void endGame(room);
    });

    socket.on("draw:decline", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.drawOfferFrom = null;
      socket.to(roomId).emit("draw:declined");
    });

    socket.on("rematch:offer", ({ roomId }) => {
      const room = rooms.get(roomId);
      const userId = socket.data.userId;
      if (!room || !userId || !room.status) return;
      const seat = room.playerSeat(userId);
      if (!seat) return;
      room.rematchWanted.add(seat);
      socket.to(roomId).emit("rematch:offered", { from: seat });
      if (room.rematchWanted.has("a") && room.rematchWanted.has("b")) {
        const aSock = userSocket.get(room.a.userId);
        const bSock = userSocket.get(room.b.userId);
        const next = new MatchRoom(
          ENGINES[room.kind as GameKind],
          { userId: room.b.userId, username: room.b.username, rating: room.b.rating, guest: room.b.userId.startsWith("guest:") },
          { userId: room.a.userId, username: room.a.username, rating: room.a.rating, guest: room.a.userId.startsWith("guest:") },
          room.rated,
        );
        rooms.set(next.id, next);
        userRoom.set(next.a.userId, next.id);
        userRoom.set(next.b.userId, next.id);
        for (const sid of [aSock, bSock]) {
          if (!sid) continue;
          const s = nsp.sockets.get(sid);
          if (s) {
            s.data.roomId = next.id;
            s.join(next.id);
          }
        }
        nsp.to(next.id).emit("rematch:ready", { roomId: next.id });
        resync(next);
      }
    });

    socket.on("chat:send", async ({ roomId, text }) => {
      const room = rooms.get(roomId);
      const userId = socket.data.userId;
      if (!room || !userId) return;
      if (!chatLimiter.allow(socket.id)) return;
      const mod = await getUserModeration(userId);
      if (mod.muted) return;
      const clean = cleanChat(text);
      if (!clean) return;
      nsp.to(roomId).emit("chat:message", { from: socket.data.username ?? "Anon", text: clean, ts: Date.now() });
    });

    // ---- admin: light-touch moderation (reuses the same admin token/auth as
    // chess's god-mode socket; no force-move/freeze/clock here on purpose —
    // just visibility into live rooms plus chat-clear and kick). ----
    socket.on("admin:hello", async ({ token }) => {
      if (await verifyAdminToken(token)) {
        socket.data.isAdmin = true;
        socket.emit("admin:ok", { games: liveBoardGames() });
      } else {
        socket.data.isAdmin = false;
        socket.emit("admin:denied");
      }
    });

    socket.on("admin:games", () => {
      if (!socket.data.isAdmin) return;
      socket.emit("admin:games", { games: liveBoardGames() });
    });

    socket.on("admin:clearChat", ({ roomId }) => {
      if (!socket.data.isAdmin) return;
      nsp.to(roomId).emit("chat:cleared");
    });

    socket.on("admin:kick", ({ userId, cooldownMs, message }) => {
      if (!socket.data.isAdmin) return;
      if (cooldownMs && cooldownMs > 0) kickCooldown.set(userId, Date.now() + cooldownMs);
      const sid = userSocket.get(userId);
      const target = sid ? nsp.sockets.get(sid) : undefined;
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
      const seat = room.playerSeat(userId);
      if (!seat || room.status) return;
      room.setConnected(userId, false);
      socket.to(roomId).emit("opponent:disconnected", { graceMs: GRACE_MS });
      const timer = setTimeout(() => {
        if (!room.status) {
          room.abandon(seat);
          void endGame(room);
        }
        graceTimers.delete(userId);
      }, GRACE_MS);
      graceTimers.set(userId, timer);
    });
  });
}
