import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

const COLS = 7;
const ROWS = 6;

export interface ConnectFourState {
  /** board[row][col], row 0 = bottom, null = empty */
  board: (Player | null)[][];
  turn: Player;
}

export interface ConnectFourMove {
  col: number; // 0-6
}

function makeEmptyBoard(): (Player | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function checkWinFrom(board: (Player | null)[][], row: number, col: number, player: Player): boolean {
  const dirs = [
    [0, 1], [1, 0], [1, 1], [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        count++;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= 4) return true;
  }
  return false;
}

export const connectFourEngine: GameEngine<ConnectFourMove, ConnectFourState> = {
  kind: "connect4",

  initialState(): ConnectFourState {
    return { board: makeEmptyBoard(), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<ConnectFourState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const col = move.col;
    if (col < 0 || col >= COLS) return { ok: false, error: "Bad column" };
    let row = -1;
    for (let r = 0; r < ROWS; r++) {
      if (state.board[r][col] === null) {
        row = r;
        break;
      }
    }
    if (row === -1) return { ok: false, error: "Column full" };
    const board = state.board.map((r) => [...r]);
    board[row][col] = player;
    return {
      ok: true,
      state: { board, turn: player === "a" ? "b" : "a" },
      notation: `${String.fromCharCode(97 + col)}${row + 1}`,
    };
  },

  getResult(state): GameResult | null {
    // Check the whole board (cheap enough at 7x6, and simpler than tracking
    // "last move" through the generic room layer).
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = state.board[r][c];
        if (p && checkWinFrom(state.board, r, c, p)) {
          return { over: true, winner: p, reason: "Four in a row" };
        }
      }
    }
    if (state.board.every((row) => row.every((c) => c !== null))) {
      return { over: true, winner: null, reason: "Board full — draw" };
    }
    return null;
  },

  serialize(state) {
    return state;
  },
};
