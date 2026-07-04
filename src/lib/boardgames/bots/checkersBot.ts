import { checkersEngine, type CheckersMove, type CheckersState } from "../engines/checkers";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickCheckersMove(state: CheckersState, player: Player, depth = 6): CheckersMove | null {
  return pickBotMove(checkersEngine, state, player, depth);
}
