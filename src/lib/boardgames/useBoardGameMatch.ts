"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  BOARDGAMES_SOCKET_URL,
  type BgClientToServerEvents,
  type BgServerToClientEvents,
  type BgChatMsg,
  type BgIdentity,
  type BgPlayerInfo,
  type BgStateMsg,
  type GameKind,
  type GameResult,
  type Seat,
} from "./protocol";

type BgSocket = Socket<BgServerToClientEvents, BgClientToServerEvents>;

export type MatchPhase = "idle" | "searching" | "playing" | "spectating";

export interface MatchState<TState> {
  phase: MatchPhase;
  connected: boolean;
  roomId: string | null;
  players: { a: BgPlayerInfo; b: BgPlayerInfo } | null;
  mySeat: Seat | null;
  board: TState | null;
  turn: Seat | null;
  status: (GameResult & { adminResolved?: boolean }) | null;
  drawOfferFrom: Seat | null;
  opponentConnected: boolean;
  chat: BgChatMsg[];
  moveCount: number;
  ratingDelta: { a: number; b: number } | null;
  inviteCode: string | null;
  error: string | null;
  rematchOfferFrom: Seat | null;
}

function initial<TState>(): MatchState<TState> {
  return {
    phase: "idle",
    connected: false,
    roomId: null,
    players: null,
    mySeat: null,
    board: null,
    turn: null,
    status: null,
    drawOfferFrom: null,
    opponentConnected: true,
    chat: [],
    moveCount: 0,
    ratingDelta: null,
    inviteCode: null,
    error: null,
    rematchOfferFrom: null,
  };
}

export function useBoardGameMatch<TMove, TState>(kind: GameKind, identity: BgIdentity) {
  const [state, setState] = useState<MatchState<TState>>(initial<TState>());
  const socketRef = useRef<BgSocket | null>(null);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const roomRef = useRef<string | null>(null);
  const [lastMove, setLastMove] = useState<{ move: TMove; notation: string; by: Seat; seq: number } | null>(null);
  const moveSeq = useRef(0);

  const patch = useCallback((p: Partial<MatchState<TState>>) => setState((s) => ({ ...s, ...p })), []);

  const ensureSocket = useCallback((): BgSocket => {
    if (socketRef.current) return socketRef.current;
    const socket: BgSocket = io(BOARDGAMES_SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => patch({ connected: true }));
    socket.on("disconnect", () => patch({ connected: false }));
    socket.on("queue:waiting", () => patch({ phase: "searching" }));
    socket.on("queue:matched", ({ roomId }) => {
      roomRef.current = roomId;
      socket.emit("room:join", { roomId, identity: identityRef.current });
    });
    socket.on("invite:created", ({ code }) => patch({ inviteCode: code, phase: "searching" }));
    socket.on("invite:error", ({ message }) => patch({ error: message }));

    socket.on("game:state", (s: BgStateMsg) => {
      roomRef.current = s.roomId;
      const mySeat: Seat | null =
        s.players.a.userId === identityRef.current.userId
          ? "a"
          : s.players.b.userId === identityRef.current.userId
            ? "b"
            : null;
      setState((prev) => ({
        ...prev,
        phase: prev.phase === "spectating" ? "spectating" : "playing",
        roomId: s.roomId,
        players: s.players,
        mySeat,
        board: s.state as TState,
        turn: s.turn,
        status: s.status,
        drawOfferFrom: s.drawOfferFrom,
        moveCount: s.moves.length,
        inviteCode: null,
      }));
    });

    socket.on("game:move", (p) => {
      moveSeq.current += 1;
      setLastMove({ move: p.move as TMove, notation: p.notation, by: p.by, seq: moveSeq.current });
      setState((s) => ({ ...s, moveCount: s.moveCount + 1 }));
    });

    socket.on("game:over", (o) => patch({ status: o, ratingDelta: o.ratingDelta ?? null }));
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
      setState((s) => ({ ...initial<TState>(), error: message, phase: "idle" as MatchPhase }) as typeof s),
    );
    socket.on("opponent:disconnected", () => patch({ opponentConnected: false }));
    socket.on("opponent:reconnected", () => patch({ opponentConnected: true }));
    socket.on("error:msg", ({ message }) => patch({ error: message }));

    return socket;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patch]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const connect = useCallback(() => ensureSocket(), [ensureSocket]);

  const findMatch = useCallback(
    (rated: boolean) => {
      const s = ensureSocket();
      setState((prev) => ({ ...initial<TState>(), connected: prev.connected, phase: "searching" }));
      s.emit("queue:join", { kind, identity: identityRef.current, rated });
    },
    [ensureSocket, kind],
  );

  const cancelSearch = useCallback(() => {
    socketRef.current?.emit("queue:leave", { kind });
    patch({ phase: "idle" });
  }, [kind, patch]);

  const createInvite = useCallback(() => {
    const s = ensureSocket();
    s.emit("invite:create", { kind, identity: identityRef.current });
  }, [ensureSocket, kind]);

  const joinInvite = useCallback(
    (code: string) => {
      const s = ensureSocket();
      s.emit("invite:join", { code, identity: identityRef.current });
    },
    [ensureSocket],
  );

  const spectate = useCallback(
    (roomId: string) => {
      const s = ensureSocket();
      roomRef.current = roomId;
      patch({ phase: "spectating" });
      s.emit("room:spectate", { roomId, identity: identityRef.current });
    },
    [ensureSocket, patch],
  );

  const rid = () => roomRef.current;
  const sendMove = useCallback((move: TMove) => rid() && socketRef.current?.emit("move", { roomId: rid()!, move }), []);
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
    setState(initial<TState>());
    roomRef.current = null;
  }, []);

  return {
    state,
    lastMove,
    connect,
    findMatch,
    cancelSearch,
    createInvite,
    joinInvite,
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
