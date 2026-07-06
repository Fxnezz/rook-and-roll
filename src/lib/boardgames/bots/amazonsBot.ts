import { amazonsEngine, type AmazonsMove, type AmazonsState } from "../engines/amazons";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

/** Depth 1 only: a single move already combines a queen-move with a queen-shot, so branching is far too wide for deeper search. */
export function pickAmazonsMove(state: AmazonsState, player: Player, depth = 1): AmazonsMove | null {
  return pickBotMove(amazonsEngine, state, player, depth);
}
