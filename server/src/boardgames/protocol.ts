import type { BgIdentity, BgPlayerInfo, MoveRecord } from "./MatchRoom.js";
import type { GameResult } from "./engine.js";

export type GameKind = "tictactoe" | "connect4" | "checkers" | "othello" | "gomoku" | "mancala";

export interface BgStateMsg {
  roomId: string;
  kind: GameKind;
  state: unknown;
  turn: "a" | "b";
  players: { a: BgPlayerInfo; b: BgPlayerInfo };
  moves: MoveRecord[];
  status: (GameResult & { adminResolved?: boolean }) | null;
  spectators: number;
  drawOfferFrom: "a" | "b" | null;
  rated: boolean;
}

export interface BgChatMsg {
  from: string;
  text: string;
  ts: number;
}

/** Light-touch admin view of one live room — enough to identify and moderate it. */
export interface BgLiveRoomSummary {
  roomId: string;
  kind: GameKind;
  a: string;
  aUserId: string;
  b: string;
  bUserId: string;
  moveCount: number;
  spectators: number;
  over: boolean;
}

export interface BgClientToServer {
  "queue:join": (p: { kind: GameKind; identity: BgIdentity; rated: boolean }) => void;
  "queue:leave": (p: { kind: GameKind }) => void;
  "invite:create": (p: { kind: GameKind; identity: BgIdentity }) => void;
  "invite:join": (p: { code: string; identity: BgIdentity }) => void;
  "room:join": (p: { roomId: string; identity: BgIdentity }) => void;
  "room:spectate": (p: { roomId: string; identity: BgIdentity }) => void;
  "room:leave": (p: { roomId: string }) => void;
  move: (p: { roomId: string; move: unknown }) => void;
  resign: (p: { roomId: string }) => void;
  "draw:offer": (p: { roomId: string }) => void;
  "draw:accept": (p: { roomId: string }) => void;
  "draw:decline": (p: { roomId: string }) => void;
  "rematch:offer": (p: { roomId: string }) => void;
  "chat:send": (p: { roomId: string; text: string }) => void;
  "admin:hello": (p: { token: string }) => void;
  "admin:games": () => void;
  "admin:clearChat": (p: { roomId: string }) => void;
  "admin:kick": (p: { userId: string; cooldownMs?: number; message?: string }) => void;
}

export interface BgServerToClient {
  "queue:waiting": (p: { position: number }) => void;
  "queue:matched": (p: { roomId: string }) => void;
  "invite:created": (p: { code: string }) => void;
  "invite:error": (p: { message: string }) => void;
  "game:state": (s: BgStateMsg) => void;
  "game:move": (p: { move: unknown; notation: string; by: "a" | "b" }) => void;
  "game:over": (p: GameResult & { ratingDelta?: { a: number; b: number } }) => void;
  "draw:offered": (p: { from: "a" | "b" }) => void;
  "draw:declined": () => void;
  "rematch:offered": (p: { from: "a" | "b" }) => void;
  "rematch:ready": (p: { roomId: string }) => void;
  "chat:message": (m: BgChatMsg) => void;
  "chat:cleared": () => void;
  kicked: (p: { message: string }) => void;
  "opponent:disconnected": (p: { graceMs: number }) => void;
  "opponent:reconnected": () => void;
  "error:msg": (p: { message: string }) => void;
  "admin:ok": (p: { games: BgLiveRoomSummary[] }) => void;
  "admin:denied": () => void;
  "admin:games": (p: { games: BgLiveRoomSummary[] }) => void;
}
