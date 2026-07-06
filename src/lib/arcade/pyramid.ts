import { freshShoe, type Card } from "./blackjack";

/**
 * Pyramid Solitaire: 28 cards dealt in a 7-row pyramid (row r has r+1
 * cards), remaining 24 cards form a stock/waste pile. A pyramid card is
 * "exposed" once both cards that physically overlap it in the row below
 * are gone (the widening rows are dealt over the narrower ones above, so
 * the bottom row is exposed from the start and the apex is exposed last).
 * Remove a King alone, or any two exposed cards (from the pyramid and/or
 * the top of the waste) that together sum to 13.
 */
export const ROWS = 7;
export const PYRAMID_SIZE = (ROWS * (ROWS + 1)) / 2; // 28

function rowStart(row: number): number {
  return (row * (row + 1)) / 2;
}

export function cellIndex(row: number, col: number): number {
  return rowStart(row) + col;
}

export function rowColOf(i: number): { row: number; col: number } {
  let row = 0;
  while (rowStart(row + 1) <= i) row++;
  return { row, col: i - rowStart(row) };
}

export interface PyramidState {
  pyramid: (Card | null)[]; // length 28, null = removed
  stock: Card[];
  waste: Card[];
}

export function deal(): PyramidState {
  const deck = freshShoe();
  return { pyramid: deck.slice(0, PYRAMID_SIZE), stock: deck.slice(PYRAMID_SIZE), waste: [] };
}

export function isExposed(pyramid: (Card | null)[], row: number, col: number): boolean {
  if (pyramid[cellIndex(row, col)] == null) return false;
  if (row >= ROWS - 1) return true; // bottom row: nothing overlaps it
  const left = pyramid[cellIndex(row + 1, col)];
  const right = pyramid[cellIndex(row + 1, col + 1)];
  return left == null && right == null;
}

export function isExposedIndex(pyramid: (Card | null)[], i: number): boolean {
  const { row, col } = rowColOf(i);
  return isExposed(pyramid, row, col);
}

function rankSumsTo13(a: number, b: number): boolean {
  return a + b === 13;
}

export function canRemoveSingle(card: Card): boolean {
  return card.rank === 13;
}

export function canRemovePair(a: Card, b: Card): boolean {
  return rankSumsTo13(a.rank, b.rank);
}

export function removeFromPyramid(state: PyramidState, indices: number[]): PyramidState {
  const pyramid = [...state.pyramid];
  for (const i of indices) pyramid[i] = null;
  return { ...state, pyramid };
}

export function removeWasteTop(state: PyramidState): PyramidState {
  return { ...state, waste: state.waste.slice(0, -1) };
}

export function drawStock(state: PyramidState): PyramidState {
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return state;
    // Recycle: waste goes back to stock (reversed so draw order isn't identical).
    return { ...state, stock: [...state.waste].reverse(), waste: [] };
  }
  const stock = [...state.stock];
  const card = stock.pop()!;
  return { ...state, stock, waste: [...state.waste, card] };
}

export function isWon(state: PyramidState): boolean {
  return state.pyramid.every((c) => c == null);
}
