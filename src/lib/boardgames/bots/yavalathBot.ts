import { yavalathEngine, type YavalathMove, type YavalathState } from "../engines/yavalath";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickYavalathMove(state: YavalathState, player: Player, depth = 1): YavalathMove | null {
  return pickBotMove(yavalathEngine, state, player, depth);
}
