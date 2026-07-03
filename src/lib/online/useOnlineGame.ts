"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Color } from "chess.js";
import {
  SOCKET_URL,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type ClockState,
  type GameOverMsg,
  type GameStateMsg,
  type ChatMsg,
  type Identity,
  type PlayerInfo,
  type TimeControlSpec,
} from "./protocol";

type OnlineSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type OnlinePhase = "idle" | "searching" | "playing" | "spectating";

export interface OnlineState {
  phase: OnlinePhase;
  connected: boolean;
  roomId: string | null;
  players: { white: PlayerInfo; black: PlayerInfo } | null;
  myColor: Color | null;
  timeControl: TimeControlSpec | null;
  clock: { whiteMs: number; blackMs: number; activeColor: Color | null; running: boolean };
  status: GameOverMsg | null;
  drawOfferFrom: Color | null;
  rematchOfferFrom: Color | null;
  opponentConnected: boolean;
  chat: ChatMsg[];
  searching: { seconds: number; players: number };
  error: string | null;
  rated: boolean;
  /** monotonic; increments when a server move should be applied */
  moveSeq: number;
  lastServerMove: { san: string; from: string; to: string; promotion?: string } | null;
  /** monotonic; increments when the board should fully resync from `fullState` */
  stateSeq: number;
  fullState: GameStateMsg | null;
}

const INITIAL: OnlineState = {
  phase: "idle",
  connected: false,
  roomId: null,
  players: null,
  myColor: null,
  timeControl: null,
  clock: { whiteMs: 0, blackMs: 0, activeColor: null, running: false },
  status: null,
  drawOfferFrom: null,
  rematchOfferFrom: null,
  opponentConnected: true,
  chat: [],
  searching: { seconds: 0, players: 0 },
  error: null,
  rated: false,
  moveSeq: 0,
  lastServerMove: null,
  stateSeq: 0,
  fullState: null,
};

export function useOnlineGame(identity: Identity) {
  const [state, setState] = useState<OnlineState>(INITIAL);
  const socketRef = useRef<OnlineSocket | null>(null);
  const clockRef = useRef<ClockState | null>(null);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const roomRef = useRef<string | null>(null);

  const patch = useCallback((p: Partial<OnlineState>) => setState((s) => ({ ...s, ...p })), []);

  const ensureSocket = useCallback((): OnlineSocket => {
    if (socketRef.current) return socketRef.current;
    const socket: OnlineSocket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      patch({ connected: true });
      // If we were in a game when the transport dropped, rejoin the room so
      // the server clears our grace timer and resends authoritative state.
      if (roomRef.current) {
        socket.emit("room:join", { roomId: roomRef.current, identity: identityRef.current });
      }
    });
    socket.on("disconnect", () => patch({ connected: false }));

    socket.on("queue:waiting", ({ playersSearching }) =>
      setState((s) => ({ ...s, phase: "searching", searching: { ...s.searching, players: playersSearching } })),
    );

    socket.on("queue:matched", ({ roomId }) => {
      roomRef.current = roomId;
      socket.emit("room:join", { roomId, identity: identityRef.current });
    });

    socket.on("game:state", (gs) => {
      clockRef.current = gs.clock;
      const my = playerColorOf(gs.players, identityRef.current.userId);
      roomRef.current = gs.roomId;
      setState((s) => ({
        ...s,
        phase: s.phase === "spectating" ? "spectating" : "playing",
        roomId: gs.roomId,
        players: gs.players,
        myColor: my,
        timeControl: gs.timeControl,
        status: gs.status,
        drawOfferFrom: gs.drawOfferFrom ?? null,
        rated: gs.rated,
        clock: liveClock(gs.clock),
        stateSeq: s.stateSeq + 1,
        fullState: gs,
      }));
    });

    socket.on("game:move", (m) => {
      clockRef.current = m.clock;
      setState((s) => ({
        ...s,
        clock: liveClock(m.clock),
        moveSeq: s.moveSeq + 1,
        lastServerMove: { san: m.san, from: m.from, to: m.to, promotion: m.promotion },
      }));
    });

    socket.on("game:over", (o) => patch({ status: o }));
    socket.on("clock:sync", (c) => {
      clockRef.current = c;
      patch({ clock: liveClock(c) });
    });
    socket.on("draw:offered", ({ from }) => patch({ drawOfferFrom: from }));
    socket.on("draw:declined", () => patch({ drawOfferFrom: null }));
    socket.on("rematch:offered", ({ from }) => patch({ rematchOfferFrom: from }));
    socket.on("rematch:ready", ({ roomId }) => {
      roomRef.current = roomId;
      setState((s) => ({ ...s, status: null, drawOfferFrom: null, rematchOfferFrom: null, chat: [] }));
      socket.emit("room:join", { roomId, identity: identityRef.current });
    });
    socket.on("chat:message", (m) => setState((s) => ({ ...s, chat: [...s.chat, m].slice(-100) })));
    socket.on("chat:cleared", () => setState((s) => ({ ...s, chat: [] })));
    socket.on("kicked", ({ message }) =>
      setState((s) => ({ ...INITIAL, error: message, phase: "idle" as OnlinePhase } as typeof s)),
    );
    socket.on("opponent:disconnected", () => patch({ opponentConnected: false }));
    socket.on("opponent:reconnected", () => patch({ opponentConnected: true }));
    socket.on("error:msg", ({ message }) => patch({ error: message }));

    return socket;
  }, [patch]);

  // local clock ticking
  useEffect(() => {
    const iv = setInterval(() => {
      if (!clockRef.current) return;
      setState((s) => (s.phase === "playing" || s.phase === "spectating" ? { ...s, clock: liveClock(clockRef.current!) } : s));
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // searching timer
  useEffect(() => {
    if (state.phase !== "searching") return;
    const start = Date.now();
    const iv = setInterval(
      () => setState((s) => ({ ...s, searching: { ...s.searching, seconds: Math.floor((Date.now() - start) / 1000) } })),
      1000,
    );
    return () => clearInterval(iv);
  }, [state.phase]);

  /** Open the socket ahead of time (e.g. when the lobby mounts). */
  const connect = useCallback(() => {
    ensureSocket();
  }, [ensureSocket]);

  const findGame = useCallback(
    (timeControl: TimeControlSpec, rated: boolean) => {
      const socket = ensureSocket();
      setState((s) => ({ ...s, phase: "searching", searching: { seconds: 0, players: 0 }, error: null, rated }));
      socket.emit("queue:join", { identity: identityRef.current, timeControl, rated });
    },
    [ensureSocket],
  );

  const cancelSearch = useCallback(() => {
    socketRef.current?.emit("queue:leave");
    setState((s) => ({ ...s, phase: "idle" }));
  }, []);

  const spectate = useCallback(
    (roomId: string) => {
      const socket = ensureSocket();
      roomRef.current = roomId;
      setState((s) => ({ ...s, phase: "spectating" }));
      socket.emit("room:spectate", { roomId, identity: identityRef.current });
    },
    [ensureSocket],
  );

  const rid = () => roomRef.current;
  const sendMove = useCallback((from: string, to: string, promotion?: string) => {
    if (rid()) socketRef.current?.emit("move", { roomId: rid()!, from, to, promotion });
  }, []);
  const resign = useCallback(() => rid() && socketRef.current?.emit("resign", { roomId: rid()! }), []);
  const offerDraw = useCallback(() => rid() && socketRef.current?.emit("draw:offer", { roomId: rid()! }), []);
  const acceptDraw = useCallback(() => rid() && socketRef.current?.emit("draw:accept", { roomId: rid()! }), []);
  const declineDraw = useCallback(() => {
    if (rid()) socketRef.current?.emit("draw:decline", { roomId: rid()! });
    patch({ drawOfferFrom: null });
  }, [patch]);
  const offerRematch = useCallback(() => rid() && socketRef.current?.emit("rematch:offer", { roomId: rid()! }), []);
  const sendChat = useCallback((text: string) => {
    if (rid() && text.trim()) socketRef.current?.emit("chat:send", { roomId: rid()!, text });
  }, []);
  const leave = useCallback(() => {
    if (rid()) socketRef.current?.emit("room:leave", { roomId: rid()! });
    setState(INITIAL);
    roomRef.current = null;
  }, []);

  // teardown
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    state,
    connect,
    findGame,
    cancelSearch,
    spectate,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    offerRematch,
    sendChat,
    leave,
    clearError: () => patch({ error: null }),
  };
}

function playerColorOf(players: { white: PlayerInfo; black: PlayerInfo }, userId: string): Color | null {
  if (players.white.userId === userId) return "w";
  if (players.black.userId === userId) return "b";
  return null;
}

/** Extrapolate the active side's remaining time from a server snapshot. */
function liveClock(c: ClockState): { whiteMs: number; blackMs: number; activeColor: Color | null; running: boolean } {
  const elapsed = c.running ? Date.now() - c.updatedAt : 0;
  return {
    whiteMs: c.activeColor === "w" ? Math.max(0, c.whiteMs - elapsed) : c.whiteMs,
    blackMs: c.activeColor === "b" ? Math.max(0, c.blackMs - elapsed) : c.blackMs,
    activeColor: c.activeColor,
    running: c.running,
  };
}
