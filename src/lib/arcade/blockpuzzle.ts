/**
 * Block Puzzle (Blockudoku-style): a 9x9 grid split into nine 3x3 boxes.
 * Place 3 given pieces anywhere they fit (no rotation, no overlap); once
 * all 3 are placed, 3 new random pieces are dealt. Any row, column, or 3x3
 * box that becomes fully occupied is cleared. Game over when none of the
 * current pieces fit anywhere on the board.
 */
export const SIZE = 9;

export type Shape = [number, number][];

export const SHAPES: Shape[] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[0, 2], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [1, 1], [1, 2], [0, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 1], [1, 0], [1, 1], [2, 0]],
];

export function randomShape(): Shape {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

export function randomTriple(): Shape[] {
  return [randomShape(), randomShape(), randomShape()];
}

export function canPlace(board: boolean[], shape: Shape, anchorRow: number, anchorCol: number): boolean {
  for (const [dr, dc] of shape) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
    if (board[r * SIZE + c]) return false;
  }
  return true;
}

export function hasAnyValidPlacement(board: boolean[], shape: Shape): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (canPlace(board, shape, r, c)) return true;
    }
  }
  return false;
}

export function isGameOver(board: boolean[], pieces: (Shape | null)[]): boolean {
  return pieces.every((p) => p == null || !hasAnyValidPlacement(board, p));
}

export interface PlaceResult {
  board: boolean[];
  cellsPlaced: number;
  linesCleared: number;
  scoreGained: number;
}

export function placePiece(board: boolean[], shape: Shape, anchorRow: number, anchorCol: number): PlaceResult | null {
  if (!canPlace(board, shape, anchorRow, anchorCol)) return null;
  const next = [...board];
  for (const [dr, dc] of shape) next[(anchorRow + dr) * SIZE + (anchorCol + dc)] = true;

  const fullRows: number[] = [];
  const fullCols: number[] = [];
  const fullBoxes: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    if (Array.from({ length: SIZE }, (_, c) => next[r * SIZE + c]).every(Boolean)) fullRows.push(r);
  }
  for (let c = 0; c < SIZE; c++) {
    if (Array.from({ length: SIZE }, (_, r) => next[r * SIZE + c]).every(Boolean)) fullCols.push(c);
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      let full = true;
      for (let dr = 0; dr < 3 && full; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          if (!next[(br * 3 + dr) * SIZE + (bc * 3 + dc)]) {
            full = false;
            break;
          }
        }
      }
      if (full) fullBoxes.push([br, bc]);
    }
  }

  for (const r of fullRows) for (let c = 0; c < SIZE; c++) next[r * SIZE + c] = false;
  for (const c of fullCols) for (let r = 0; r < SIZE; r++) next[r * SIZE + c] = false;
  for (const [br, bc] of fullBoxes) {
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) next[(br * 3 + dr) * SIZE + (bc * 3 + dc)] = false;
  }

  const linesCleared = fullRows.length + fullCols.length + fullBoxes.length;
  const scoreGained = shape.length + linesCleared * 18 + (linesCleared > 1 ? (linesCleared - 1) * 18 : 0);
  return { board: next, cellsPlaced: shape.length, linesCleared, scoreGained };
}
