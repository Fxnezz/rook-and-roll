/**
 * Tetris core rules: standard 10x20 well, 7-bag randomizer, SRS-style piece
 * shapes/rotation states, hold, line clears, and a level speed curve.
 *
 * Scope note: rotation uses the official SRS piece geometry and spawn
 * orientations, but a SIMPLIFIED wall-kick search (try in place, then a few
 * small offsets) rather than the full 5-test SRS kick table per rotation
 * pair. This plays correctly for the vast majority of rotations — the
 * differences only show up in advanced T-spin setups, which are out of
 * scope for a hobby implementation.
 */

export const COLS = 10;
export const ROWS = 20;

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface Cell {
  x: number;
  y: number;
}

// Each piece defined by 4 rotation states (0,R,2,L), each a list of 4 cell
// offsets from the piece's origin, following SRS spawn geometry.
const SHAPES: Record<PieceType, Cell[][]> = {
  I: [
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
    [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
  ],
  O: [
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  ],
  T: [
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  S: [
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  Z: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }],
  ],
  J: [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  ],
  L: [
    [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
};

export const PIECE_COLORS: Record<PieceType, string> = {
  I: "#5aa8e0",
  O: "#e0c030",
  T: "#b06fe0",
  S: "#5bbf7a",
  Z: "#e5604d",
  J: "#4a6fd0",
  L: "#e9a23b",
};

export interface ActivePiece {
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
  ox: number; // origin x (grid col of the piece's 4x4 box)
  oy: number; // origin y
}

export type Grid = (PieceType | null)[][];

export function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function pieceCells(p: ActivePiece): Cell[] {
  return SHAPES[p.type][p.rotation].map((c) => ({ x: c.x + p.ox, y: c.y + p.oy }));
}

export function spawnPiece(type: PieceType): ActivePiece {
  return { type, rotation: 0, ox: 0, oy: type === "I" ? -1 : 0 };
}

export function collides(grid: Grid, p: ActivePiece): boolean {
  for (const c of pieceCells(p)) {
    if (c.x < 0 || c.x >= COLS || c.y >= ROWS) return true;
    if (c.y >= 0 && grid[c.y][c.x]) return true;
  }
  return false;
}

/** 7-bag: each bag is a shuffled permutation of all 7 pieces. */
export function newBag(rng: () => number = Math.random): PieceType[] {
  const bag: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

const KICKS: Cell[] = [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: -1 }, { x: 1, y: -1 }];

/** Try rotating; returns the new piece if any kick offset resolves the collision. */
export function tryRotate(grid: Grid, p: ActivePiece, dir: 1 | -1): ActivePiece | null {
  const rotation = ((p.rotation + dir + 4) % 4) as 0 | 1 | 2 | 3;
  for (const k of KICKS) {
    const candidate: ActivePiece = { ...p, rotation, ox: p.ox + k.x, oy: p.oy + k.y };
    if (!collides(grid, candidate)) return candidate;
  }
  return null;
}

export function lockPiece(grid: Grid, p: ActivePiece): Grid {
  const next = grid.map((row) => [...row]);
  for (const c of pieceCells(p)) {
    if (c.y >= 0 && c.y < ROWS) next[c.y][c.x] = p.type;
  }
  return next;
}

export function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const remaining = grid.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - remaining.length;
  const newRows = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { grid: [...newRows, ...remaining], cleared };
}

const LINE_SCORES = [0, 100, 300, 500, 800];
export function scoreForLines(lines: number, level: number): number {
  return (LINE_SCORES[lines] ?? 0) * level;
}

export function levelForLines(totalLines: number): number {
  return Math.floor(totalLines / 10) + 1;
}

export function dropIntervalMs(level: number): number {
  return Math.max(80, 1000 - (level - 1) * 80);
}

export function ghostPiece(grid: Grid, p: ActivePiece): ActivePiece {
  let ghost = p;
  while (!collides(grid, { ...ghost, oy: ghost.oy + 1 })) {
    ghost = { ...ghost, oy: ghost.oy + 1 };
  }
  return ghost;
}
