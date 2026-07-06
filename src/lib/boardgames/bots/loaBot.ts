import { loaEngine, type LoaMove, type LoaState } from "../engines/linesofaction";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickLoaMove(state: LoaState, player: Player, depth = 2): LoaMove | null {
  return pickBotMove(loaEngine, state, player, depth);
}
