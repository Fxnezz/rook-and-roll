/**
 * Flood-It: a 14x14 grid of random colors. Each move recolors the connected
 * region containing the top-left cell to a chosen color; any newly-adjacent
 * same-color cells merge into that region on the next move (since two
 * touching same-colored cells are, by definition, one connected region —
 * no separate "territory" set needs tracking, a fresh flood-fill from the
 * origin each move is exactly the flood-it rule). Fill the whole board
 * within the move limit to win.
 */
export const SIZE = 14;
export const COLOR_COUNT = 6;
export const MAX_MOVES = 25;

export function randomBoard(): number[] {
  return Array.from({ length: SIZE * SIZE }, () => Math.floor(Math.random() * COLOR_COUNT));
}

export function floodFill(board: number[], targetColor: number): number[] {
  const startColor = board[0];
  if (startColor === targetColor) return board;
  const next = [...board];
  const visited = new Array(board.length).fill(false);
  visited[0] = true;
  const queue: number[] = [0];
  while (queue.length > 0) {
    const i = queue.shift()!;
    next[i] = targetColor;
    const row = Math.floor(i / SIZE);
    const col = i % SIZE;
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
      const ni = r * SIZE + c;
      if (visited[ni] || board[ni] !== startColor) continue;
      visited[ni] = true;
      queue.push(ni);
    }
  }
  return next;
}

export function isSolved(board: number[]): boolean {
  return board.every((c) => c === board[0]);
}
