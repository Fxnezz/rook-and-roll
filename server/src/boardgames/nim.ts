import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Classic Nim, normal play — see src/lib/boardgames/engines/nim.ts for full commentary. */
export interface NimState {
  piles: number[];
  turn: Player;
}

export interface NimMove {
  pile: number;
  count: number;
}

const STARTING_PILES = [3, 5, 7];

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

export const nimEngine: GameEngine<NimMove, NimState> = {
  kind: "nim",

  initialState(): NimState {
    return { piles: [...STARTING_PILES], turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<NimState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const { pile, count } = move;
    if (pile == null || pile < 0 || pile >= state.piles.length) return { ok: false, error: "No such pile" };
    if (count == null || count < 1 || count > state.piles[pile]) return { ok: false, error: "Invalid count" };

    const piles = [...state.piles];
    piles[pile] -= count;
    const notation = `pile ${pile + 1} −${count}`;
    return { ok: true, state: { piles, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    if (state.piles.some((p) => p > 0)) return null;
    return { over: true, winner: otherPlayer(state.turn), reason: "Took the last object" };
  },

  serialize(state) {
    return state;
  },
};
