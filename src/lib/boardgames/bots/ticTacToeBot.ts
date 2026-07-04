import { ticTacToeEngine, type TicTacToeMove, type TicTacToeState } from "../engines/ticTacToe";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

/** Perfect play — the search always reaches a terminal state within 9 plies. */
export function pickTicTacToeMove(state: TicTacToeState, player: Player): TicTacToeMove | null {
  return pickBotMove(ticTacToeEngine, state, player, 9);
}
