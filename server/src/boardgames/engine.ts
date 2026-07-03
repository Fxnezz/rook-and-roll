/**
 * Generic two-player turn-based board game engine, shared by Tic-Tac-Toe,
 * Connect Four, and Checkers. This is the "GameRoom" pattern already proven
 * for chess, generalized: matchmaking, rooms, resign/rematch/spectate/chat
 * live in MatchRoom.ts and are written ONCE; each game only supplies its own
 * board representation and rules through this interface.
 */
export type Player = "a" | "b";

export interface MoveResult<TState> {
  ok: boolean;
  state?: TState;
  error?: string;
  /** short human-readable notation for the move list, e.g. "d4" or "c3-d4" */
  notation?: string;
}

export interface GameResult {
  over: boolean;
  winner: Player | null;
  reason: string;
}

export interface GameEngine<TMove, TState> {
  kind: string;
  initialState(): TState;
  turnOf(state: TState): Player;
  /** Apply a move for `player`; must reject illegal moves without mutating. */
  applyMove(state: TState, player: Player, move: TMove): MoveResult<TState>;
  /** Called after every successful move to check for a decided game. */
  getResult(state: TState): GameResult | null;
  /** JSON-safe snapshot sent to clients (usually just `state` itself). */
  serialize(state: TState): unknown;
}
