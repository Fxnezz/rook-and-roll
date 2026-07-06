/**
 * Classic English peg solitaire: a 33-hole cross-shaped board. Jump a peg
 * over an adjacent peg into an empty hole two spaces away (orthogonally
 * only); the jumped peg is removed. Goal: end with as few pegs as possible,
 * ideally just one, in the center.
 */
export const ROWS = 7;
export const COLS = 7;

export function isValidCell(row: number, col: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  const midRow = row >= 2 && row <= 4;
  const midCol = col >= 2 && col <= 4;
  return midRow || midCol;
}

function idx(row: number, col: number): number {
  return row * COLS + col;
}

export function initialBoard(): boolean[] {
  const board = Array(ROWS * COLS).fill(false);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (isValidCell(row, col)) board[idx(row, col)] = true;
    }
  }
  board[idx(3, 3)] = false; // center starts empty
  return board;
}

export interface PegMove {
  from: number;
  over: number;
  to: number;
}

const DIRS: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

export function legalMoves(board: boolean[]): PegMove[] {
  const moves: PegMove[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!isValidCell(row, col) || !board[idx(row, col)]) continue;
      for (const [dr, dc] of DIRS) {
        const overRow = row + dr;
        const overCol = col + dc;
        const toRow = row + dr * 2;
        const toCol = col + dc * 2;
        if (!isValidCell(overRow, overCol) || !isValidCell(toRow, toCol)) continue;
        if (board[idx(overRow, overCol)] && !board[idx(toRow, toCol)]) {
          moves.push({ from: idx(row, col), over: idx(overRow, overCol), to: idx(toRow, toCol) });
        }
      }
    }
  }
  return moves;
}

export function applyMove(board: boolean[], move: PegMove): boolean[] {
  const next = [...board];
  next[move.from] = false;
  next[move.over] = false;
  next[move.to] = true;
  return next;
}

export function pegCount(board: boolean[]): number {
  return board.filter(Boolean).length;
}

export function isSolved(board: boolean[]): boolean {
  return pegCount(board) === 1;
}
