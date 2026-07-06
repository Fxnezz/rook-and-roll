import { breakthroughEngine, type BreakthroughMove, type BreakthroughState } from "../engines/breakthrough";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickBreakthroughMove(state: BreakthroughState, player: Player, depth = 3): BreakthroughMove | null {
  return pickBotMove(breakthroughEngine, state, player, depth);
}
