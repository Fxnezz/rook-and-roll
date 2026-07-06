import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Connect6 on a 15x15 board: six in a row (any of the 4 axes) wins. Each
 * turn places TWO stones as one atomic move — except the very first move of
 * the game, which places only one (this is what keeps the opening fair
 * despite the first player otherwise getting a 2-stone head start). Modeling
 * "place two stones" as a single move (rather than two separate turns) is
 * the same pattern used for Pentago's place-then-rotate action: it keeps the
 * shared negamax's strict turn-alternation assumption valid.
 */
export type Cell = Player | null;

export interface Connect6State {
  board: Cell[][];
  turn: Player;
  movesPlaced: number; // total stones placed so far, to know if this is the 1-stone opening move
}

export interface Connect6Move {
  cells: { row: number; col: number }[]; // length 1 for the opening move, length 2 otherwise
}

export const SIZE = 15;
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => [...row]);
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
        if (count >= 6) return p;
      }
    }
  }
  return null;
}

export const connect6Engine: BotCapableEngine<Connect6Move, Connect6State> = {
  kind: "connect6",

  initialState(): Connect6State {
    return { board: emptyBoard(), turn: "a", movesPlaced: 0 };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<Connect6State> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const expected = state.movesPlaced === 0 ? 1 : 2;
    if (move.cells.length !== expected) return { ok: false, error: `Place exactly ${expected} stone(s)` };

    const seen = new Set<string>();
    for (const { row, col } of move.cells) {
      if (!inBounds(row, col)) return { ok: false, error: "Off the board" };
      if (state.board[row][col] !== null) return { ok: false, error: "That square is occupied" };
      const key = `${row},${col}`;
      if (seen.has(key)) return { ok: false, error: "Duplicate cell in the same move" };
      seen.add(key);
    }

    const board = cloneBoard(state.board);
    for (const { row, col } of move.cells) board[row][col] = player;
    const notation = move.cells.map(({ row, col }) => `${String.fromCharCode(97 + col)}${row + 1}`).join(",");
    return {
      ok: true,
      state: { board, turn: otherPlayer(player), movesPlaced: state.movesPlaced + move.cells.length },
      notation,
    };
  },

  getResult(state): GameResult | null {
    const winner = checkWinner(state.board);
    if (winner) return { over: true, winner, reason: "Six in a row" };
    if (state.board.every((row) => row.every((c) => c !== null))) return { over: true, winner: null, reason: "Board full" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): Connect6Move[] {
    if (state.turn !== player) return [];
    // Bot uses a dedicated heuristic (connect6Bot.ts); this is only for interface
    // compliance and returns single-cell candidates near existing stones.
    const has = state.board.some((row) => row.some((c) => c !== null));
    if (!has) return [{ cells: [{ row: 7, col: 7 }] }];
    const seen = new Set<string>();
    const out: Connect6Move[] = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (state.board[row][col] === null) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const r = row + dr;
            const c = col + dc;
            if (!inBounds(r, c) || state.board[r][c] !== null) continue;
            const key = `${r},${c}`;
            if (!seen.has(key)) {
              seen.add(key);
              out.push({ cells: [{ row: r, col: c }] });
            }
          }
        }
      }
    }
    return out;
  },

  evaluate(state, player): number {
    let score = 0;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const p = state.board[row][col];
        if (!p) continue;
        for (const [dr, dc] of DIRS) {
          const pr = row - dr;
          const pc = col - dc;
          if (inBounds(pr, pc) && state.board[pr][pc] === p) continue;
          let len = 0;
          let r = row;
          let c = col;
          while (inBounds(r, c) && state.board[r][c] === p) {
            len++;
            r += dr;
            c += dc;
          }
          const s = len >= 6 ? 100_000 : len * len;
          score += p === player ? s : -s;
        }
      }
    }
    return score;
  },
};
