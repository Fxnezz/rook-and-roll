import { quoridorEngine, type QuoridorMove, type QuoridorState } from "../engines/quoridor";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickQuoridorMove(state: QuoridorState, player: Player, depth = 2): QuoridorMove | null {
  return pickBotMove(quoridorEngine, state, player, depth);
}
