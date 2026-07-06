import { halmaEngine, type HalmaMove, type HalmaState } from "../engines/halma";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickHalmaMove(state: HalmaState, player: Player, depth = 2): HalmaMove | null {
  return pickBotMove(halmaEngine, state, player, depth);
}
