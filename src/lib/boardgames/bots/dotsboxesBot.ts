import { dotsBoxesEngine, type DotsBoxesMove, type DotsBoxesState } from "../engines/dotsboxes";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickDotsBoxesMove(state: DotsBoxesState, player: Player, depth = 3): DotsBoxesMove | null {
  return pickBotMove(dotsBoxesEngine, state, player, depth);
}
