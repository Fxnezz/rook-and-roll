import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Domineering on a 6x6 board. Player "a" always places dominoes vertically
 * (covering two vertically adjacent cells), player "b" always places
 * horizontally. Players alternate; whoever cannot place a domino on their
 * turn loses (no draws are possible).
 */
export const ROWS = 6;
export const COLS = 6;

export interface DomineeringState {
  board: boolean[]; // true = occupied, length ROWS*COLS
  turn: Player;
}

export interface DomineeringMove {
  cell: number; // anchor cell; orientation implied by whose turn it is
}

function idx(row: number, col: number): number {
  return row * COLS + col;
}
function rowOf(i: number): number {
  return Math.floor(i / COLS);
}
function colOf(i: number): number {
  return i % COLS;
}

/** All legal placements for `player`, regardless of whose turn it actually is (used by evaluate). */
function movesFor(board: boolean[], player: Player): number[] {
  const moves: number[] = [];
  if (player === "a") {
    for (let row = 0; row < ROWS - 1; row++) {
      for (let col = 0; col < COLS; col++) {
        const c1 = idx(row, col);
        const c2 = idx(row + 1, col);
        if (!board[c1] && !board[c2]) moves.push(c1);
      }
    }
  } else {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 1; col++) {
        const c1 = idx(row, col);
        const c2 = idx(row, col + 1);
        if (!board[c1] && !board[c2]) moves.push(c1);
      }
    }
  }
  return moves;
}

export const domineeringEngine: BotCapableEngine<DomineeringMove, DomineeringState> = {
  kind: "domineering",

  initialState(): DomineeringState {
    return { board: Array(ROWS * COLS).fill(false), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<DomineeringState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const legal = movesFor(state.board, player);
    if (!legal.includes(move.cell)) return { ok: false, error: "Illegal placement" };

    const board = [...state.board];
    const row = rowOf(move.cell);
    const col = colOf(move.cell);
    board[move.cell] = true;
    board[player === "a" ? idx(row + 1, col) : idx(row, col + 1)] = true;
    const notation = `${player === "a" ? "V" : "H"}@${move.cell}`;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    if (movesFor(state.board, state.turn).length === 0) {
      return {
        over: true,
        winner: otherPlayer(state.turn),
        reason: `${state.turn === "a" ? "Vertical" : "Horizontal"} has no room left`,
      };
    }
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): DomineeringMove[] {
    if (state.turn !== player) return [];
    return movesFor(state.board, player).map((cell) => ({ cell }));
  },

  evaluate(state, player): number {
    return movesFor(state.board, player).length - movesFor(state.board, otherPlayer(player)).length;
  },
};
