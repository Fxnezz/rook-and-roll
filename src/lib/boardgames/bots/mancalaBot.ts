import { mancalaEngine, type MancalaMove, type MancalaState } from "../engines/mancala";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickMancalaMove(state: MancalaState, player: Player, depth = 8): MancalaMove | null {
  return pickBotMove(mancalaEngine, state, player, depth);
}
