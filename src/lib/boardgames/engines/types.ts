/**
 * Client-side mirror of server/src/boardgames/engine.ts — the same
 * generic two-player turn-based interface, ported so bot/pass-and-play modes
 * can run the exact rules locally without a socket connection. The server
 * remains the source of truth for online play; these copies exist purely for
 * offline/local modes and must stay behaviorally identical.
 */
export type Player = "a" | "b";

export interface MoveResult<TState> {
  ok: boolean;
  state?: TState;
  error?: string;
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
  applyMove(state: TState, player: Player, move: TMove): MoveResult<TState>;
  getResult(state: TState): GameResult | null;
  serialize(state: TState): unknown;
}

/** Extra hooks a GameEngine needs to support local bot play. */
export interface BotCapableEngine<TMove, TState> extends GameEngine<TMove, TState> {
  generateMoves(state: TState, player: Player): TMove[];
  evaluate(state: TState, player: Player): number;
}

export function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}
