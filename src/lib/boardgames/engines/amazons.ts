import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Amazons, mini 6x6 version (2 amazons per side, down from the standard
 * 10x10/4-amazon game to keep the bot's branching factor tractable — a
 * single move already combines a queen-move with a queen-shot, so full-size
 * Amazons has far too many move combinations for any shallow search). Each
 * turn: slide an amazon like a chess queen to an empty square, then from
 * its new position shoot an arrow (also queen-move) onto another empty
 * square, which becomes permanently blocked. Whoever can't move loses.
 */
export const SIZE = 6;

export type Cell = Player | "burned" | null;

export interface AmazonsState {
  board: Cell[];
  turn: Player;
}

export interface AmazonsMove {
  from: number;
  to: number;
  shoot: number;
}

function idx(r: number, c: number): number {
  return r * SIZE + c;
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

const DIRS8: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function queenDestinations(board: Cell[], from: number): number[] {
  const r = Math.floor(from / SIZE);
  const c = from % SIZE;
  const out: number[] = [];
  for (const [dr, dc] of DIRS8) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && board[idx(nr, nc)] == null) {
      out.push(idx(nr, nc));
      nr += dr;
      nc += dc;
    }
  }
  return out;
}

function mobility(board: Cell[], from: number): number {
  return queenDestinations(board, from).length;
}

function initialBoard(): Cell[] {
  const board: Cell[] = Array(SIZE * SIZE).fill(null);
  board[idx(0, 1)] = "a";
  board[idx(0, 4)] = "a";
  board[idx(SIZE - 1, 1)] = "b";
  board[idx(SIZE - 1, 4)] = "b";
  return board;
}

export const amazonsEngine: BotCapableEngine<AmazonsMove, AmazonsState> = {
  kind: "amazons",

  initialState(): AmazonsState {
    return { board: initialBoard(), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<AmazonsState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (state.board[move.from] !== player) return { ok: false, error: "No amazon there" };
    if (!queenDestinations(state.board, move.from).includes(move.to)) return { ok: false, error: "Illegal move" };

    const afterMove = [...state.board];
    afterMove[move.to] = player;
    afterMove[move.from] = null;
    if (!queenDestinations(afterMove, move.to).includes(move.shoot)) return { ok: false, error: "Illegal shot" };

    afterMove[move.shoot] = "burned";
    return {
      ok: true,
      state: { board: afterMove, turn: otherPlayer(player) },
      notation: `${move.from}->${move.to} shoot ${move.shoot}`,
    };
  },

  getResult(state): GameResult | null {
    const mover = state.turn;
    const hasMove = state.board.some((c, i) => c === mover && queenDestinations(state.board, i).length > 0);
    if (!hasMove) return { over: true, winner: otherPlayer(mover), reason: "No legal moves" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): AmazonsMove[] {
    if (state.turn !== player) return [];
    const moves: AmazonsMove[] = [];
    state.board.forEach((c, from) => {
      if (c !== player) return;
      for (const to of queenDestinations(state.board, from)) {
        const afterMove = [...state.board];
        afterMove[to] = player;
        afterMove[from] = null;
        for (const shoot of queenDestinations(afterMove, to)) {
          moves.push({ from, to, shoot });
        }
      }
    });
    return moves;
  },

  evaluate(state, player): number {
    const opponent = otherPlayer(player);
    let mine = 0;
    let theirs = 0;
    state.board.forEach((c, i) => {
      if (c === player) mine += mobility(state.board, i);
      else if (c === opponent) theirs += mobility(state.board, i);
    });
    return mine - theirs;
  },
};
