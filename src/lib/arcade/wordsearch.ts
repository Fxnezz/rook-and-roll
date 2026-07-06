/** Word Search: places a fixed word list into a 14x14 grid in one of 8 directions, filling the rest with random letters. */
export const SIZE = 14;

export const WORD_LIST = ["CHESS", "KNIGHT", "ROOK", "QUEEN", "PAWN", "BISHOP", "CASTLE", "CHECKMATE"];

const DIRS8: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export interface PlacedWord {
  word: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

function tryPlace(grid: (string | null)[][], word: string): { row: number; col: number; dr: number; dc: number } | null {
  for (let attempt = 0; attempt < 300; attempt++) {
    const [dr, dc] = DIRS8[Math.floor(Math.random() * DIRS8.length)];
    const row = Math.floor(Math.random() * SIZE);
    const col = Math.floor(Math.random() * SIZE);
    const endRow = row + dr * (word.length - 1);
    const endCol = col + dc * (word.length - 1);
    if (endRow < 0 || endRow >= SIZE || endCol < 0 || endCol >= SIZE) continue;
    let ok = true;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = grid[r][c];
      if (existing != null && existing !== word[i]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    return { row, col, dr, dc };
  }
  return null;
}

export function generatePuzzle(): { grid: string[][]; placed: PlacedWord[] } {
  const grid: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const placed: PlacedWord[] = [];
  const sorted = [...WORD_LIST].sort((a, b) => b.length - a.length);
  for (const word of sorted) {
    const pos = tryPlace(grid, word);
    if (!pos) continue;
    for (let i = 0; i < word.length; i++) grid[pos.row + pos.dr * i][pos.col + pos.dc * i] = word[i];
    placed.push({ word, ...pos });
  }
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const finalGrid = grid.map((row) => row.map((c) => c ?? letters[Math.floor(Math.random() * letters.length)]));
  return { grid: finalGrid, placed };
}

export function cellsForPlacement(p: PlacedWord): [number, number][] {
  return Array.from({ length: p.word.length }, (_, i) => [p.row + p.dr * i, p.col + p.dc * i]);
}

export function checkSelection(placed: PlacedWord[], start: [number, number], end: [number, number]): PlacedWord | null {
  for (const p of placed) {
    const cells = cellsForPlacement(p);
    const first = cells[0];
    const last = cells[cells.length - 1];
    const forward = first[0] === start[0] && first[1] === start[1] && last[0] === end[0] && last[1] === end[1];
    const backward = first[0] === end[0] && first[1] === end[1] && last[0] === start[0] && last[1] === start[1];
    if (forward || backward) return p;
  }
  return null;
}
