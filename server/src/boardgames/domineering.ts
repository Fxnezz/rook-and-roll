import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/domineering.ts — see there for full commentary. */
export const ROWS = 6;
export const COLS = 6;

export interface DomineeringState {
  board: boolean[];
  turn: Player;
}

export interface DomineeringMove {
  cell: number;
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
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

export const domineeringEngine: GameEngine<DomineeringMove, DomineeringState> = {
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
};
