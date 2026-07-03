export type Board2048 = number[][]; // [row][col], 0 = empty
export type Dir2048 = "up" | "down" | "left" | "right";

export const SIZE_2048 = 4;

export function emptyBoard2048(): Board2048 {
  return Array.from({ length: SIZE_2048 }, () => Array(SIZE_2048).fill(0));
}

function emptyCells(board: Board2048): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  for (let r = 0; r < SIZE_2048; r++) for (let c = 0; c < SIZE_2048; c++) if (board[r][c] === 0) out.push({ r, c });
  return out;
}

export function spawnTile(board: Board2048, rng: () => number = Math.random): Board2048 {
  const cells = emptyCells(board);
  if (cells.length === 0) return board;
  const { r, c } = cells[Math.floor(rng() * cells.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = rng() < 0.9 ? 2 : 4;
  return next;
}

/** Compact + merge a single row toward its start (left); returns [newRow, scoreGained, moved]. */
function slideRow(row: number[]): [number[], number, boolean] {
  const vals = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] !== 0 && vals[i] === vals[i + 1]) {
      const merged = vals[i] * 2;
      out.push(merged);
      gained += merged;
      i++; // skip the tile we merged with
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < row.length) out.push(0);
  const moved = out.some((v, i) => v !== row[i]);
  return [out, gained, moved];
}

function transpose(board: Board2048): Board2048 {
  return board[0].map((_, c) => board.map((row) => row[c]));
}

export function move2048(board: Board2048, dir: Dir2048): { board: Board2048; gained: number; moved: boolean } {
  let working = board.map((row) => [...row]);
  let flip = false;
  let rotate = false;

  if (dir === "right") flip = true;
  if (dir === "down") {
    rotate = true;
    flip = true;
  }
  if (dir === "up") rotate = true;

  if (rotate) working = transpose(working);
  if (flip) working = working.map((row) => [...row].reverse());

  let gained = 0;
  let moved = false;
  const result = working.map((row) => {
    const [newRow, g, m] = slideRow(row);
    gained += g;
    moved = moved || m;
    return newRow;
  });

  let out = result;
  if (flip) out = out.map((row) => [...row].reverse());
  if (rotate) out = transpose(out);

  return { board: out, gained, moved };
}

export function canMove2048(board: Board2048): boolean {
  if (emptyCells(board).length > 0) return true;
  for (let r = 0; r < SIZE_2048; r++) {
    for (let c = 0; c < SIZE_2048; c++) {
      const v = board[r][c];
      if (c + 1 < SIZE_2048 && board[r][c + 1] === v) return true;
      if (r + 1 < SIZE_2048 && board[r + 1][c] === v) return true;
    }
  }
  return false;
}

export function hasTile2048(board: Board2048, value: number): boolean {
  return board.some((row) => row.includes(value));
}
