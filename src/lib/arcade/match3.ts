/**
 * Match-3 (Bejeweled-style), 8x8 grid, 6 colors. Swap two orthogonally
 * adjacent tiles; if the swap creates a run of 3+ same-colored tiles in a
 * row or column, the run clears, tiles above fall to fill the gap, new
 * random tiles spawn at the top, and this repeats (cascading) until no
 * more matches remain. A swap that creates no match is illegal and reverts.
 */
export const SIZE = 8;
export const COLORS = 6;

export function randomBoard(): number[] {
  let board: number[];
  do {
    board = Array.from({ length: SIZE * SIZE }, () => Math.floor(Math.random() * COLORS));
  } while (findMatches(board).size > 0);
  return board;
}

export function findMatches(board: number[]): Set<number> {
  const matched = new Set<number>();
  for (let r = 0; r < SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= SIZE; c++) {
      if (c < SIZE && board[r * SIZE + c] === board[r * SIZE + runStart]) continue;
      if (c - runStart >= 3) for (let k = runStart; k < c; k++) matched.add(r * SIZE + k);
      runStart = c;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= SIZE; r++) {
      if (r < SIZE && board[r * SIZE + c] === board[runStart * SIZE + c]) continue;
      if (r - runStart >= 3) for (let k = runStart; k < r; k++) matched.add(k * SIZE + c);
      runStart = r;
    }
  }
  return matched;
}

export function areAdjacent(a: number, b: number): boolean {
  const ar = Math.floor(a / SIZE);
  const ac = a % SIZE;
  const br = Math.floor(b / SIZE);
  const bc = b % SIZE;
  return (ar === br && Math.abs(ac - bc) === 1) || (ac === bc && Math.abs(ar - br) === 1);
}

function swap(board: number[], a: number, b: number): number[] {
  const next = [...board];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** Attempts the swap; returns null if illegal (not adjacent or creates no match). */
export function trySwap(board: number[], a: number, b: number): number[] | null {
  if (!areAdjacent(a, b)) return null;
  const swapped = swap(board, a, b);
  if (findMatches(swapped).size === 0) return null;
  return swapped;
}

function applyGravityAndRefill(board: number[], matched: Set<number>): number[] {
  const next = [...board];
  for (const i of matched) next[i] = -1;
  for (let c = 0; c < SIZE; c++) {
    const survivors: number[] = [];
    for (let r = SIZE - 1; r >= 0; r--) {
      if (next[r * SIZE + c] !== -1) survivors.push(next[r * SIZE + c]);
    }
    while (survivors.length < SIZE) survivors.push(Math.floor(Math.random() * COLORS));
    for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) next[r * SIZE + c] = survivors[i];
  }
  return next;
}

export interface CascadeResult {
  board: number[];
  totalCleared: number;
  scoreGained: number;
  cascades: number;
}

export function resolveCascade(board: number[]): CascadeResult {
  let current = board;
  let totalCleared = 0;
  let scoreGained = 0;
  let cascades = 0;
  while (true) {
    const matched = findMatches(current);
    if (matched.size === 0) break;
    cascades++;
    totalCleared += matched.size;
    scoreGained += matched.size * 10 * cascades;
    current = applyGravityAndRefill(current, matched);
  }
  return { board: current, totalCleared, scoreGained, cascades };
}
