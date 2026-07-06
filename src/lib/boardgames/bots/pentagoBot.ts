import { pentagoEngine, type PentagoMove, type PentagoState } from "../engines/pentago";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

// Depth 1: each move is (empty cell x 4 quadrants x 2 directions), so branching
// is already large early game — lean on evaluate() rather than deep search.
export function pickPentagoMove(state: PentagoState, player: Player, depth = 1): PentagoMove | null {
  return pickBotMove(pentagoEngine, state, player, depth);
}
