import { yGameEngine, type YGameMove, type YGameState } from "../engines/ygame";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickYGameMove(state: YGameState, player: Player, depth = 2): YGameMove | null {
  return pickBotMove(yGameEngine, state, player, depth);
}
