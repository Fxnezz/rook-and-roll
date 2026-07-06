import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Client-side mirror of server/src/boardgames/nim.ts. Classic Nim, normal
 * play: players alternate removing 1+ objects from a single pile; whoever
 * takes the last object wins. Starting piles are fixed (3, 5, 7) — a nim-sum
 * (3 XOR 5 XOR 7 = 1) that favors the first mover with perfect play, same as
 * real Nim.
 */
export interface NimState {
  piles: number[];
  turn: Player;
}

export interface NimMove {
  pile: number;
  count: number;
}

const STARTING_PILES = [3, 5, 7];

export const nimEngine: BotCapableEngine<NimMove, NimState> = {
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
    if (pile < 0 || pile >= state.piles.length) return { ok: false, error: "No such pile" };
    if (count < 1 || count > state.piles[pile]) return { ok: false, error: "Invalid count" };

    const piles = [...state.piles];
    piles[pile] -= count;
    const notation = `pile ${pile + 1} −${count}`;
    return { ok: true, state: { piles, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    if (state.piles.some((p) => p > 0)) return null;
    // The player who just moved (i.e. NOT the one now "to move") took the last object.
    return { over: true, winner: otherPlayer(state.turn), reason: "Took the last object" };
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): NimMove[] {
    if (state.turn !== player) return [];
    const moves: NimMove[] = [];
    state.piles.forEach((size, pile) => {
      for (let count = 1; count <= size; count++) moves.push({ pile, count });
    });
    return moves;
  },

  evaluate(state, player): number {
    const nimSum = state.piles.reduce((acc, p) => acc ^ p, 0);
    const toMove = state.turn;
    // A nonzero nim-sum favors whoever is about to move.
    const favorsMover = nimSum !== 0;
    const mover = toMove === player ? 1 : -1;
    return favorsMover ? 10 * mover : -10 * mover;
  },
};

/** Perfect play via the nim-sum strategy — always wins whenever the position is theoretically winning. */
export function pickNimMove(state: NimState, player: Player): NimMove | null {
  if (state.turn !== player) return null;
  const nimSum = state.piles.reduce((acc, p) => acc ^ p, 0);
  if (nimSum !== 0) {
    for (let pile = 0; pile < state.piles.length; pile++) {
      const target = state.piles[pile] ^ nimSum;
      if (target < state.piles[pile]) {
        return { pile, count: state.piles[pile] - target };
      }
    }
  }
  // Already-losing position (nim-sum 0): no move preserves the win, so just
  // take one object from the largest pile.
  let biggest = 0;
  for (let i = 1; i < state.piles.length; i++) if (state.piles[i] > state.piles[biggest]) biggest = i;
  if (state.piles[biggest] === 0) return null;
  return { pile: biggest, count: 1 };
}
