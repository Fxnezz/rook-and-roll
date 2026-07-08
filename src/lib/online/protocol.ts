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
  voided?: boolean;
  /** Newly-earned achievement ids per side (empty/absent if none). */
  achievements?: { white: string[]; black: string[] };
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
  takebackOfferFrom?: Color | null;
  rated: boolean;
  frozen?: { w: boolean; b: boolean };
  paused?: boolean;
  roomMuted?: { w: boolean; b: boolean };
  moveTimesMs?: number[];
  disconnectedSince?: { w: number | null; b: number | null };
  spectatorList?: { username: string }[];
}

export interface AdminPiece {
  type: "p" | "n" | "b" | "r" | "q" | "k";
  color: Color;
}

export interface ChallengeInfo {
  id: string;
  from: { userId: string; username: string; rating: number };
  timeControl: TimeControlSpec;
  rated: boolean;
}

export interface LiveGameSummary {
  roomId: string;
  white: string;
  black: string;
  whiteRating: number;
  blackRating: number;
  ply: number;
  fen: string;
  timeControl: string;
  category: string;
  rated: boolean;
  over: boolean;
  spectators: number;
  reviewFlagged: boolean;
  suspicion: { w: number; b: number };
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
  "takeback:offered": (p: { from: Color }) => void;
  "takeback:declined": () => void;
  "rematch:offered": (p: { from: Color }) => void;
  "rematch:ready": (p: { roomId: string }) => void;
  "chat:message": (m: ChatMsg) => void;
  "opponent:disconnected": (p: { graceMs: number }) => void;
  "opponent:reconnected": () => void;
  "error:msg": (p: { message: string }) => void;
  "presence:status": (p: { online: string[] }) => void;
  "challenge:received": (p: ChallengeInfo) => void;
  "challenge:declined": (p: { challengeId: string }) => void;
  "challenge:cancelled": (p: { challengeId: string }) => void;
  "challenge:error": (p: { challengeId?: string; message: string }) => void;
  "admin:ok": (p: { games: LiveGameSummary[] }) => void;
  "admin:denied": () => void;
  "admin:games": (p: { games: LiveGameSummary[] }) => void;
  kicked: (p: { message: string }) => void;
  "chat:cleared": () => void;
}

export interface ClientToServerEvents {
  "queue:join": (p: { identity: Identity; timeControl: TimeControlSpec; rated: boolean }) => void;
  "queue:leave": () => void;
  "room:join": (p: { roomId: string; identity: Identity }) => void;
  "room:spectate": (p: { roomId: string; identity: Identity }) => void;
  "room:leave": (p: { roomId: string }) => void;
  move: (p: { roomId: string; from: string; to: string; promotion?: string }) => void;
  resign: (p: { roomId: string }) => void;
  abort: (p: { roomId: string }) => void;
  "draw:offer": (p: { roomId: string }) => void;
  "draw:accept": (p: { roomId: string }) => void;
  "draw:decline": (p: { roomId: string }) => void;
  "takeback:offer": (p: { roomId: string }) => void;
  "takeback:accept": (p: { roomId: string }) => void;
  "takeback:decline": (p: { roomId: string }) => void;
  "rematch:offer": (p: { roomId: string }) => void;
  "rematch:accept": (p: { roomId: string }) => void;
  "chat:send": (p: { roomId: string; text: string }) => void;
  "presence:hello": (p: { identity: Identity }) => void;
  "presence:query": (p: { userIds: string[] }) => void;
  "challenge:send": (p: { identity: Identity; toUserId: string; timeControl: TimeControlSpec; rated: boolean }) => void;
  "challenge:accept": (p: { challengeId: string; identity: Identity }) => void;
  "challenge:decline": (p: { challengeId: string }) => void;
  "challenge:cancel": (p: { challengeId: string }) => void;
  "admin:hello": (p: { token: string }) => void;
  "admin:games": () => void;
  "admin:attach": (p: { roomId: string }) => void;
  "admin:setFen": (p: { roomId: string; fen: string }) => void;
  "admin:place": (p: { roomId: string; square: string; piece: AdminPiece | null }) => void;
  "admin:forceMove": (p: { roomId: string; from: string; to: string; promotion?: string }) => void;
  "admin:forceResult": (p: { roomId: string; result: "1-0" | "0-1" | "1/2-1/2" }) => void;
  "admin:clock": (p: { roomId: string; color: Color; addSeconds?: number; pause?: boolean; disable?: boolean }) => void;
  "admin:freeze": (p: { roomId: string; color: Color | "both"; frozen: boolean }) => void;
  "admin:swap": (p: { roomId: string }) => void;
  "admin:kick": (p: { userId: string; cooldownMs?: number; message?: string }) => void;
  "admin:clearChat": (p: { roomId: string }) => void;
  "admin:systemMessage": (p: { roomId: string; text: string }) => void;
  "admin:whisper": (p: { roomId: string; color: Color; text: string }) => void;
  "admin:pause": (p: { roomId: string; paused: boolean }) => void;
  "admin:void": (p: { roomId: string; reason?: string }) => void;
  "admin:muteChat": (p: { roomId: string; color: Color; muted: boolean }) => void;
  "admin:extendBoth": (p: { roomId: string; addSeconds: number }) => void;
  "admin:resetClocks": (p: { roomId: string }) => void;
  "admin:forceRematch": (p: { roomId: string }) => void;
  "admin:cancelGame": (p: { roomId: string }) => void;
  "admin:flagReview": (p: { roomId: string; flagged: boolean }) => void;
}

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
