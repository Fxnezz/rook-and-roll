import { connectFourEngine, type ConnectFourMove, type ConnectFourState } from "../engines/connectFour";
import type { Player } from "../engines/types";
import { pickBotMove } from "./minimax";

export function pickConnectFourMove(state: ConnectFourState, player: Player, depth = 7): ConnectFourMove | null {
  return pickBotMove(connectFourEngine, state, player, depth);
}
