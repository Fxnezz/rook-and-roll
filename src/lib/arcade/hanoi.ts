/**
 * Tower of Hanoi, 3 pegs, disks sized 1 (smallest) to DISK_COUNT (largest).
 * Move one disk at a time, never placing a larger disk on a smaller one;
 * move the whole stack from peg 0 to peg 2. Minimum moves = 2^n - 1.
 */
export const DISK_COUNT = 5;

export type Pegs = number[][]; // 3 stacks; index 0 = bottom of stack

export function initialPegs(n = DISK_COUNT): Pegs {
  const start = Array.from({ length: n }, (_, i) => n - i); // [n, n-1, ..., 1], largest at bottom
  return [start, [], []];
}

export function canMove(pegs: Pegs, from: number, to: number): boolean {
  if (from === to) return false;
  const src = pegs[from];
  if (src.length === 0) return false;
  const top = src[src.length - 1];
  const dst = pegs[to];
  return dst.length === 0 || dst[dst.length - 1] > top;
}

export function move(pegs: Pegs, from: number, to: number): Pegs {
  const next = pegs.map((p) => [...p]);
  const disk = next[from].pop()!;
  next[to].push(disk);
  return next;
}

export function isSolved(pegs: Pegs, n = DISK_COUNT): boolean {
  return pegs[2].length === n;
}

export function minMoves(n = DISK_COUNT): number {
  return 2 ** n - 1;
}
