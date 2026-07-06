import { hexEngine, type HexMove, type HexState } from "../engines/hex";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickHexMove(state: HexState, player: Player, depth = 2): HexMove | null {
  return pickBotMove(hexEngine, state, player, depth);
}
