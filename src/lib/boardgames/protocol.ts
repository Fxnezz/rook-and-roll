// Client-side mirror of server/src/boardgames/protocol.ts (the /boardgames
// Socket.IO namespace — Tic-Tac-Toe, Connect Four, Checkers).

export type Seat = "a" | "b";
export type GameKind = "tictactoe" | "connect4" | "checkers";

export interface BgIdentity {
  userId: string;
  username: string;
  rating: number;
  guest: boolean;
}

export interface BgPlayerInfo {
  userId: string;
  username: string;
  rating: number;
  seat: Seat;
  connected: boolean;
}

export interface MoveRecord {
  notation: string;
  by: Seat;
}

export interface GameResult {
  over: boolean;
  winner: Seat | null;
  reason: string;
}

export interface BgStateMsg {
  roomId: string;
  kind: GameKind;
  state: unknown;
  turn: Seat;
  players: { a: BgPlayerInfo; b: BgPlayerInfo };
  moves: MoveRecord[];
  status: (GameResult & { adminResolved?: boolean }) | null;
  spectators: number;
  drawOfferFrom: Seat | null;
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

export interface BgClientToServerEvents {
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

export interface BgServerToClientEvents {
  "queue:waiting": (p: { position: number }) => void;
  "queue:matched": (p: { roomId: string }) => void;
  "invite:created": (p: { code: string }) => void;
  "invite:error": (p: { message: string }) => void;
  "game:state": (s: BgStateMsg) => void;
  "game:move": (p: { move: unknown; notation: string; by: Seat }) => void;
  "game:over": (p: GameResult & { ratingDelta?: { a: number; b: number } }) => void;
  "draw:offered": (p: { from: Seat }) => void;
  "draw:declined": () => void;
  "rematch:offered": (p: { from: Seat }) => void;
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

export const BOARDGAMES_SOCKET_URL = `${process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000"}/boardgames`;
