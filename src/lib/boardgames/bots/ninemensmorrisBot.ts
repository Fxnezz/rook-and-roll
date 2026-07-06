import { nineMensMorrisEngine, type NineMensMorrisMove, type NineMensMorrisState } from "../engines/ninemensmorris";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickNineMensMorrisMove(state: NineMensMorrisState, player: Player, depth = 2): NineMensMorrisMove | null {
  return pickBotMove(nineMensMorrisEngine, state, player, depth);
}
