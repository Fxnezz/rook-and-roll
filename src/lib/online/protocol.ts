// Client-side mirror of server/src/protocol.ts. Keep in sync with the server.
import type { Color } from "chess.js";

export interface Identity {
  userId: string;
  username: string;
  rating: number;
  guest: boolean;
}

export interface TimeControlSpec {
  id: string;
  initialMs: number | null;
  incrementMs: number;
  category: string;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  running: boolean;
  activeColor: Color | null;
  updatedAt: number;
}

export interface PlayerInfo {
  userId: string;
  username: string;
  rating: number;
  color: Color;
  connected: boolean;
}

export interface GameOverMsg {
  result: "1-0" | "0-1" | "1/2-1/2";
  winner: Color | null;
  reason: string;
  ratingDelta?: { white: number; black: number };
}

export interface GameStateMsg {
  roomId: string;
  fen: string;
  pgn: string;
  moves: { san: string; from: string; to: string; promotion?: string }[];
  turn: Color;
  players: { white: PlayerInfo; black: PlayerInfo };
  clock: ClockState;
  timeControl: TimeControlSpec;
  status: GameOverMsg | null;
  spectators: number;
  drawOfferFrom?: Color | null;
  rated: boolean;
}

export interface ChatMsg {
  from: string;
  text: string;
  ts: number;
  system?: boolean;
}

export interface ServerToClientEvents {
  "queue:waiting": (p: { position: number; playersSearching: number }) => void;
  "queue:matched": (p: { roomId: string }) => void;
  "game:state": (s: GameStateMsg) => void;
  "game:move": (p: { san: string; from: string; to: string; promotion?: string; clock: ClockState }) => void;
  "game:over": (p: GameOverMsg) => void;
  "clock:sync": (p: ClockState) => void;
  "draw:offered": (p: { from: Color }) => void;
  "draw:declined": () => void;
  "rematch:offered": (p: { from: Color }) => void;
  "rematch:ready": (p: { roomId: string }) => void;
  "chat:message": (m: ChatMsg) => void;
  "opponent:disconnected": (p: { graceMs: number }) => void;
  "opponent:reconnected": () => void;
  "error:msg": (p: { message: string }) => void;
}

export interface ClientToServerEvents {
  "queue:join": (p: { identity: Identity; timeControl: TimeControlSpec; rated: boolean }) => void;
  "queue:leave": () => void;
  "room:join": (p: { roomId: string; identity: Identity }) => void;
  "room:spectate": (p: { roomId: string; identity: Identity }) => void;
  "room:leave": (p: { roomId: string }) => void;
  move: (p: { roomId: string; from: string; to: string; promotion?: string }) => void;
  resign: (p: { roomId: string }) => void;
  "draw:offer": (p: { roomId: string }) => void;
  "draw:accept": (p: { roomId: string }) => void;
  "draw:decline": (p: { roomId: string }) => void;
  "rematch:offer": (p: { roomId: string }) => void;
  "rematch:accept": (p: { roomId: string }) => void;
  "chat:send": (p: { roomId: string; text: string }) => void;
}

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
