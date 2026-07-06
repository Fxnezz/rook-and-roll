import { fanoronaEngine, type FanoronaMove, type FanoronaState } from "../engines/fanorona";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickFanoronaMove(state: FanoronaState, player: Player, depth = 2): FanoronaMove | null {
  return pickBotMove(fanoronaEngine, state, player, depth);
}
