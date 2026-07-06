import { lGameEngine, type LGameMove, type LGameState } from "../engines/lgame";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickLGameMove(state: LGameState, player: Player, depth = 2): LGameMove | null {
  return pickBotMove(lGameEngine, state, player, depth);
}
