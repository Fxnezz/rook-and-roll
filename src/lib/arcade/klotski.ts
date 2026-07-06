// Klotski (Huarong Dao) — classic sliding-block puzzle. 4-wide x 5-tall
// board; slide the 2x2 "king" block down to the exit at the bottom-center.
export interface KlotskiBlock {
  id: number;
  row: number;
  col: number;
  w: number;
  h: number;
}

export interface KlotskiState {
  blocks: KlotskiBlock[];
}

export const BOARD_W = 4;
export const BOARD_H = 5;
export const KING_ID = 0;

export function initialState(): KlotskiState {
  return {
    blocks: [
      { id: 0, row: 0, col: 1, w: 2, h: 2 }, // king
      { id: 1, row: 0, col: 0, w: 1, h: 2 }, // top-left
      { id: 2, row: 0, col: 3, w: 1, h: 2 }, // top-right
      { id: 3, row: 2, col: 0, w: 1, h: 2 }, // mid-left
      { id: 4, row: 2, col: 3, w: 1, h: 2 }, // mid-right
      { id: 5, row: 2, col: 1, w: 2, h: 1 }, // mid-middle (horizontal)
      { id: 6, row: 3, col: 1, w: 1, h: 1 },
      { id: 7, row: 3, col: 2, w: 1, h: 1 },
      { id: 8, row: 4, col: 0, w: 1, h: 1 },
      { id: 9, row: 4, col: 3, w: 1, h: 1 },
    ],
  };
}

function occupied(blocks: KlotskiBlock[], excludeId: number): Set<string> {
  const set = new Set<string>();
  for (const b of blocks) {
    if (b.id === excludeId) continue;
    for (let r = b.row; r < b.row + b.h; r++) for (let c = b.col; c < b.col + b.w; c++) set.add(`${r},${c}`);
  }
  return set;
}

export function canMove(state: KlotskiState, blockId: number, dr: number, dc: number): boolean {
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return false;
  const nr = block.row + dr;
  const nc = block.col + dc;
  if (nr < 0 || nc < 0 || nr + block.h > BOARD_H || nc + block.w > BOARD_W) return false;
  const others = occupied(state.blocks, blockId);
  for (let r = nr; r < nr + block.h; r++) for (let c = nc; c < nc + block.w; c++) if (others.has(`${r},${c}`)) return false;
  return true;
}

export function moveBlock(state: KlotskiState, blockId: number, dr: number, dc: number): KlotskiState | null {
  if (!canMove(state, blockId, dr, dc)) return null;
  return {
    blocks: state.blocks.map((b) => (b.id === blockId ? { ...b, row: b.row + dr, col: b.col + dc } : { ...b })),
  };
}

export function isSolved(state: KlotskiState): boolean {
  const king = state.blocks.find((b) => b.id === KING_ID)!;
  return king.row === BOARD_H - king.h && king.col === 1;
}
