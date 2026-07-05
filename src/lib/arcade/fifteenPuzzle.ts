// 4x4 sliding puzzle. Board is a flat 16-length array; 0 represents the blank.
export type FpBoard = number[];

const SIZE = 4;

export function solvedBoard(): FpBoard {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
}

function blankIndex(board: FpBoard): number {
  return board.indexOf(0);
}

function neighborsOf(idx: number): number[] {
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  const out: number[] = [];
  if (row > 0) out.push(idx - SIZE);
  if (row < SIZE - 1) out.push(idx + SIZE);
  if (col > 0) out.push(idx - 1);
  if (col < SIZE - 1) out.push(idx + 1);
  return out;
}

/**
 * Shuffles by performing many random legal slides from the solved position —
 * guarantees a solvable result (unlike a random permutation, which is only
 * solvable half the time) without needing an inversion-parity check.
 */
export function shuffledBoard(moves = 200): FpBoard {
  let board = solvedBoard();
  let lastBlank = -1;
  for (let i = 0; i < moves; i++) {
    const blank = blankIndex(board);
    const options = neighborsOf(blank).filter((n) => n !== lastBlank);
    const next = options[Math.floor(Math.random() * options.length)];
    const nb = [...board];
    [nb[blank], nb[next]] = [nb[next], nb[blank]];
    board = nb;
    lastBlank = blank;
  }
  return board;
}

/** Slides the tile at `idx` into the blank if adjacent; returns null if illegal. */
export function slide(board: FpBoard, idx: number): FpBoard | null {
  const blank = blankIndex(board);
  if (!neighborsOf(blank).includes(idx)) return null;
  const next = [...board];
  [next[blank], next[idx]] = [next[idx], next[blank]];
  return next;
}

export function isSolved(board: FpBoard): boolean {
  return board.every((v, i) => v === solvedBoard()[i]);
}
