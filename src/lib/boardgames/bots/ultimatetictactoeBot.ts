import { ultimateTicTacToeEngine, type UtttMove, type UtttState } from "../engines/ultimatetictactoe";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickUltimateTicTacToeMove(state: UtttState, player: Player, depth = 3): UtttMove | null {
  return pickBotMove(ultimateTicTacToeEngine, state, player, depth);
}
