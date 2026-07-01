import type { Color, Square } from "chess.js";

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function fileIndex(square: Square): number {
  return square.charCodeAt(0) - 97; // 'a' -> 0
}
export function rankIndex(square: Square): number {
  return square.charCodeAt(1) - 49; // '1' -> 0
}

/** Row/col (0..7) of a square for the given board orientation. col/row measured from top-left. */
export function squareToRowCol(square: Square, orientation: Color): { row: number; col: number } {
  const f = fileIndex(square);
  const r = rankIndex(square);
  if (orientation === "w") {
    return { row: 7 - r, col: f };
  }
  return { row: r, col: 7 - f };
}

/** Percentage offset (0..87.5) of a square's top-left corner. */
export function squareToPercent(square: Square, orientation: Color): { x: number; y: number } {
  const { row, col } = squareToRowCol(square, orientation);
  return { x: col * 12.5, y: row * 12.5 };
}

/** Square at a given row/col for the orientation. */
export function rowColToSquare(row: number, col: number, orientation: Color): Square {
  let f: number;
  let r: number;
  if (orientation === "w") {
    f = col;
    r = 7 - row;
  } else {
    f = 7 - col;
    r = row;
  }
  return (FILES[f] + RANKS[r]) as Square;
}

/** Convert a pointer position (relative to the board's top-left) into a square. */
export function pointToSquare(
  offsetX: number,
  offsetY: number,
  boardSize: number,
  orientation: Color,
): Square | null {
  if (offsetX < 0 || offsetY < 0 || offsetX >= boardSize || offsetY >= boardSize) return null;
  const col = Math.floor((offsetX / boardSize) * 8);
  const row = Math.floor((offsetY / boardSize) * 8);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  return rowColToSquare(row, col, orientation);
}

export function isLightSquare(square: Square): boolean {
  return (fileIndex(square) + rankIndex(square)) % 2 === 1;
}
