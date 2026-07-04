import type { BotCapableEngine, Player } from "../engines/types";

/**
 * Generic negamax with alpha-beta pruning, parameterized over any
 * BotCapableEngine. Terminal states score ±(10000 + remaining depth) so the
 * bot prefers a faster win / slower loss over an equally "won" position
 * further out.
 */
function negamax<TMove, TState>(
  engine: BotCapableEngine<TMove, TState>,
  state: TState,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const result = engine.getResult(state);
  if (result) {
    if (!result.winner) return 0;
    return result.winner === player ? 10000 + depth : -(10000 + depth);
  }
  if (depth === 0) return engine.evaluate(state, player);

  const moves = engine.generateMoves(state, player);
  if (moves.length === 0) return engine.evaluate(state, player);

  const opponent: Player = player === "a" ? "b" : "a";
  let best = -Infinity;
  for (const move of moves) {
    const res = engine.applyMove(state, player, move);
    if (!res.ok || !res.state) continue;
    const score = -negamax(engine, res.state, opponent, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? engine.evaluate(state, player) : best;
}

/** Picks the best move for `player` at `state`, searching `depth` plies deep. */
export function pickBotMove<TMove, TState>(
  engine: BotCapableEngine<TMove, TState>,
  state: TState,
  player: Player,
  depth: number,
): TMove | null {
  const moves = engine.generateMoves(state, player);
  if (moves.length === 0) return null;
  const opponent: Player = player === "a" ? "b" : "a";

  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;
  for (const move of moves) {
    const res = engine.applyMove(state, player, move);
    if (!res.ok || !res.state) continue;
    const score = -negamax(engine, res.state, opponent, depth - 1, -beta, -alpha);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (bestScore > alpha) alpha = bestScore;
  }
  return bestMove;
}
