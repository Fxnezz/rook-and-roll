import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/**
 * Freestyle Gomoku (Five in a Row), 15x15 board, no forbidden-move
 * restrictions. First to get five or more in a row along any of the 4 axes
 * (horizontal/vertical/both diagonals) wins.
 */
export type Cell = Player | null;

export interface GomokuState {
  board: Cell[][];
  turn: Player;
}

export interface GomokuMove {
  row: number;
  col: number;
}

const SIZE = 15;
const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => [...row]);
}

function boardFull(board: Cell[][]): boolean {
  return board.every((row) => row.every((c) => c !== null));
}

function checkWinner(board: Cell[][]): Player | null {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        let count = 1;
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c) && board[r][c] === p) {
          count++;
          r += dr;
          c += dc;
        }
        if (count >= 5) return p;
      }
    }
  }
  return null;
}

export const gomokuEngine: GameEngine<GomokuMove, GomokuState> = {
  kind: "gomoku",

  initialState(): GomokuState {
    return { board: emptyBoard(), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<GomokuState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const { row, col } = move;
    if (row == null || col == null || !inBounds(row, col)) return { ok: false, error: "Off the board" };
    if (state.board[row][col] !== null) return { ok: false, error: "That square is occupied" };

    const board = cloneBoard(state.board);
    board[row][col] = player;
    const notation = `${String.fromCharCode(97 + col)}${row + 1}`;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    const winner = checkWinner(state.board);
    if (winner) return { over: true, winner, reason: "Five in a row" };
    if (boardFull(state.board)) return { over: true, winner: null, reason: "Board full" };
    return null;
  },

  serialize(state) {
    return state;
  },
};
