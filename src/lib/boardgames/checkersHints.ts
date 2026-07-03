/**
 * Client-side mirror of the pure legality helpers in
 * server/src/boardgames/checkers.ts, used ONLY to highlight legal
 * destinations and build multi-jump paths as the player clicks. The server
 * re-validates every move independently — this never needs to be perfectly
 * exploit-proof, only accurate enough for a good UX.
 */
export type Seat = "a" | "b";
export interface Piece {
  player: Seat;
  king: boolean;
}
export type Board = (Piece | null)[][];
export interface Sq {
  row: number;
  col: number;
}

const SIZE = 8;
const forwardDir = (p: Seat) => (p === "a" ? 1 : -1);
const backRow = (p: Seat) => (p === "a" ? SIZE - 1 : 0);
const inBounds = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

function stepDirs(piece: Piece): [number, number][] {
  const f = forwardDir(piece.player);
  return piece.king ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[f, 1], [f, -1]];
}

export function jumpsFrom(board: Board, row: number, col: number): Sq[] {
  const piece = board[row]?.[col];
  if (!piece) return [];
  const out: Sq[] = [];
  for (const [dr, dc] of stepDirs(piece)) {
    const mr = row + dr;
    const mc = col + dc;
    const lr = row + dr * 2;
    const lc = col + dc * 2;
    if (!inBounds(lr, lc)) continue;
    const mid = board[mr]?.[mc];
    if (mid && mid.player !== piece.player && board[lr][lc] === null) out.push({ row: lr, col: lc });
  }
  return out;
}

export function simpleMovesFrom(board: Board, row: number, col: number): Sq[] {
  const piece = board[row]?.[col];
  if (!piece) return [];
  const out: Sq[] = [];
  for (const [dr, dc] of stepDirs(piece)) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && board[r][c] === null) out.push({ row: r, col: c });
  }
  return out;
}

export function anyCaptureAvailable(board: Board, player: Seat): boolean {
  for (let row = 0; row < SIZE; row++)
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (p && p.player === player && jumpsFrom(board, row, col).length > 0) return true;
    }
  return false;
}

/** Legal destinations for the piece at (row,col), respecting forced capture. */
export function legalDestinations(board: Board, row: number, col: number, turn: Seat): Sq[] {
  const piece = board[row]?.[col];
  if (!piece || piece.player !== turn) return [];
  const mustCapture = anyCaptureAvailable(board, turn);
  return mustCapture ? jumpsFrom(board, row, col) : simpleMovesFrom(board, row, col);
}

/** Apply one hop optimistically (for building a multi-jump path client-side). */
export function applyHop(board: Board, from: Sq, to: Sq): Board {
  const next = board.map((r) => r.map((c) => (c ? { ...c } : null)));
  const piece = next[from.row][from.col]!;
  const isJump = Math.abs(to.row - from.row) === 2;
  if (isJump) {
    const mr = (from.row + to.row) / 2;
    const mc = (from.col + to.col) / 2;
    next[mr][mc] = null;
  }
  next[to.row][to.col] = piece;
  next[from.row][from.col] = null;
  if (!piece.king && to.row === backRow(piece.player)) {
    next[to.row][to.col] = { ...piece, king: true };
  }
  return next;
}

export function justKinged(board: Board, sq: Sq): boolean {
  const piece = board[sq.row]?.[sq.col];
  return !!piece && piece.king && sq.row === backRow(piece.player);
}
