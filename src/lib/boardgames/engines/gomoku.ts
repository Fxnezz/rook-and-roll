import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Client-side mirror of server/src/boardgames/gomoku.ts. Freestyle rules on a
 * 15x15 board: first to get five or more in a row (any of the 4 axes) wins,
 * no forbidden-move restrictions for either side.
 */
export type Cell = Player | null;

export interface GomokuState {
  board: Cell[][];
  turn: Player;
}

export interface Sq {
  row: number;
  col: number;
}

export interface GomokuMove {
  row: number;
  col: number;
}

const SIZE = 15;
const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

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

/** Returns the winner (if any 5+ in a row exists anywhere on the board). */
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

/** Returns the coordinates of a winning 5-in-a-row (for UI highlighting), or null. */
export function findWinningLine(board: Cell[][]): Sq[] | null {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        const line: Sq[] = [{ row, col }];
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c) && board[r][c] === p) {
          line.push({ row: r, col: c });
          r += dr;
          c += dc;
        }
        if (line.length >= 5) return line;
      }
    }
  }
  return null;
}

/** Open ends of any live (both-sides-open) three for `player`, for the bot's tactical pre-check. */
export function findOpenThreeEnds(board: Cell[][], player: Player): Sq[] {
  const ends: Sq[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== player) continue;
      for (const [dr, dc] of DIRS) {
        const pr = row - dr;
        const pc = col - dc;
        if (inBounds(pr, pc) && board[pr][pc] === player) continue; // not a run start
        let len = 0;
        let r = row;
        let c = col;
        while (inBounds(r, c) && board[r][c] === player) {
          len++;
          r += dr;
          c += dc;
        }
        const startOpen = inBounds(pr, pc) && board[pr][pc] === null;
        const endOpen = inBounds(r, c) && board[r][c] === null;
        if (len === 3 && startOpen && endOpen) {
          ends.push({ row: pr, col: pc }, { row: r, col: c });
        }
      }
    }
  }
  return ends;
}

function lineScore(len: number, openEnds: number): number {
  if (len >= 5) return 100_000;
  if (len === 4) return openEnds >= 1 ? 10_000 : 200;
  if (len === 3) return openEnds === 2 ? 1_000 : openEnds === 1 ? 150 : 0;
  if (len === 2) return openEnds === 2 ? 50 : openEnds === 1 ? 10 : 0;
  if (len === 1) return openEnds === 2 ? 2 : 0;
  return 0;
}

function evaluateBoard(board: Cell[][], player: Player): number {
  let score = 0;
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        const pr = row - dr;
        const pc = col - dc;
        if (inBounds(pr, pc) && board[pr][pc] === p) continue; // not the start of a run
        let len = 0;
        let r = row;
        let c = col;
        while (inBounds(r, c) && board[r][c] === p) {
          len++;
          r += dr;
          c += dc;
        }
        const startOpen = inBounds(pr, pc) && board[pr][pc] === null;
        const endOpen = inBounds(r, c) && board[r][c] === null;
        const s = lineScore(len, (startOpen ? 1 : 0) + (endOpen ? 1 : 0));
        // Must stay zero-sum (evaluate(s,a) === -evaluate(s,b)) since the shared
        // negamax search negates this value at every ply — any asymmetric weight
        // here (e.g. scoring defense higher than offense) breaks that invariant
        // and produces incorrect minimax results, not just "less optimal" ones.
        score += p === player ? s : -s;
      }
    }
  }
  return score;
}

/** Candidate moves near existing stones — full 225-cell search is infeasible for minimax. */
function candidateMoves(board: Cell[][]): Sq[] {
  const has = board.some((row) => row.some((c) => c !== null));
  if (!has) return [{ row: 7, col: 7 }];
  const seen = new Set<string>();
  const out: Sq[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === null) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (!inBounds(r, c) || board[r][c] !== null) continue;
          const key = `${r},${c}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ row: r, col: c });
          }
        }
      }
    }
  }
  return out;
}

export const gomokuEngine: BotCapableEngine<GomokuMove, GomokuState> = {
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
    if (!inBounds(row, col)) return { ok: false, error: "Off the board" };
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

  generateMoves(state): GomokuMove[] {
    return candidateMoves(state.board);
  },

  evaluate(state, player): number {
    return evaluateBoard(state.board, player);
  },
};
