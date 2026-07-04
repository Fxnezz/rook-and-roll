import { othelloEngine, type OthelloMove, type OthelloState } from "../engines/othello";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickOthelloMove(state: OthelloState, player: Player, depth = 6): OthelloMove | null {
  return pickBotMove(othelloEngine, state, player, depth);
}
