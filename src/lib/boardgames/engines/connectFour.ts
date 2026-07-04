import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";

const COLS = 7;
const ROWS = 6;

export interface ConnectFourState {
  board: (Player | null)[][]; // [row][col], row 0 = bottom
  turn: Player;
}

export interface ConnectFourMove {
  col: number;
}

function makeEmptyBoard(): (Player | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function checkWinFrom(board: (Player | null)[][], row: number, col: number, player: Player): boolean {
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
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

// Center-weighted column preference, matching the classic Connect Four
// heuristic (center columns participate in more winning lines).
const COL_WEIGHT = [3, 4, 5, 7, 5, 4, 3];

function countOpenLines(board: (Player | null)[][], player: Player): number {
  let score = 0;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        const cells: (Player | null)[] = [];
        let ok = true;
        for (let i = 0; i < 4; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) {
            ok = false;
            break;
          }
          cells.push(board[rr][cc]);
        }
        if (!ok) continue;
        const mine = cells.filter((v) => v === player).length;
        const theirs = cells.filter((v) => v && v !== player).length;
        if (theirs === 0 && mine > 0) score += mine * mine;
      }
    }
  }
  return score;
}

export const connectFourEngine: BotCapableEngine<ConnectFourMove, ConnectFourState> = {
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
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = state.board[r][c];
        if (p && checkWinFrom(state.board, r, c, p)) return { over: true, winner: p, reason: "Four in a row" };
      }
    }
    if (state.board.every((row) => row.every((c) => c !== null))) return { over: true, winner: null, reason: "Board full — draw" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state): ConnectFourMove[] {
    const cols: ConnectFourMove[] = [];
    for (let c = 0; c < COLS; c++) if (state.board[ROWS - 1][c] === null) cols.push({ col: c });
    // Center-first ordering makes alpha-beta pruning much more effective.
    return cols.sort((a, b) => COL_WEIGHT[b.col] - COL_WEIGHT[a.col]);
  },

  evaluate(state, player): number {
    const opp = player === "a" ? "b" : "a";
    let score = countOpenLines(state.board, player) - countOpenLines(state.board, opp);
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (state.board[r][c] === player) score += COL_WEIGHT[c];
        else if (state.board[r][c] === opp) score -= COL_WEIGHT[c];
      }
    }
    return score;
  },
};
