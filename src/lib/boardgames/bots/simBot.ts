import { simEngine, type SimMove, type SimState } from "../engines/sim";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickSimMove(state: SimState, player: Player, depth = 5): SimMove | null {
  return pickBotMove(simEngine, state, player, depth);
}
