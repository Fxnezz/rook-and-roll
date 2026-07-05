import { gomokuEngine, findOpenThreeEnds, type GomokuMove, type GomokuState } from "../engines/gomoku";
import { otherPlayer, type Player } from "../engines/types";
import { pickBotMove } from "./minimax";

/** First candidate move (if any) that immediately wins for `player`. */
function findImmediateWin(state: GomokuState, player: Player): GomokuMove | null {
  for (const move of gomokuEngine.generateMoves(state, player)) {
    const res = gomokuEngine.applyMove(state, player, move);
    if (res.ok && res.state && gomokuEngine.getResult(res.state)?.winner === player) return move;
  }
  return null;
}

/**
 * Gomoku's tactics are dominated by forcing sequences (an unanswered open
 * three becomes an unstoppable open four) that a shallow minimax can't see
 * past — depth 3-4 static eval treats "opponent made a four" as already lost
 * even when there's still time to block it. Rather than paying for a much
 * deeper (and much slower) search, handle the two sharp, well-defined
 * tactical cases explicitly before falling back to search for everything
 * else: take an immediate win, block an immediate loss, and don't let an
 * opponent's live (open-both-ends) three go unanswered.
 */
export function pickGomokuMove(state: GomokuState, player: Player, depth = 3): GomokuMove | null {
  const win = findImmediateWin(state, player);
  if (win) return win;

  const opp = otherPlayer(player);
  const mustBlock = findImmediateWin(state, opp);
  if (mustBlock) return mustBlock;

  const openThreeEnds = findOpenThreeEnds(state.board, opp);
  if (openThreeEnds.length > 0) return openThreeEnds[0];

  return pickBotMove(gomokuEngine, state, player, depth);
}
