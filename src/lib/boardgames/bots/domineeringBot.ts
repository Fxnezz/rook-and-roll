import { domineeringEngine, type DomineeringMove, type DomineeringState } from "../engines/domineering";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickDomineeringMove(state: DomineeringState, player: Player, depth = 3): DomineeringMove | null {
  return pickBotMove(domineeringEngine, state, player, depth);
}
