import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/**
 * Standard American checkers (8x8, forced capture, mandatory multi-jump,
 * kings move either diagonal direction one square). Pieces sit only on dark
 * squares where (row + col) is odd. Player "a" starts on rows 0-2 and moves
 * toward increasing row; player "b" starts on rows 5-7 and moves toward
 * decreasing row.
 */

export interface Piece {
  player: Player;
  king: boolean;
}

export interface CheckersState {
  board: (Piece | null)[][]; // [row][col], 8x8
  turn: Player;
}

export interface Sq {
  row: number;
  col: number;
}

/** A full move: a simple step (length 2) or a chain of jumps (length >= 2). */
export interface CheckersMove {
  path: Sq[];
}

const SIZE = 8;
const forwardDir = (p: Player): number => (p === "a" ? 1 : -1);
const backRow = (p: Player): number => (p === "a" ? SIZE - 1 : 0);

function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function emptyBoard(): (Piece | null)[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function initialBoard(): (Piece | null)[][] {
  const b = emptyBoard();
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!isDark(row, col)) continue;
      if (row <= 2) b[row][col] = { player: "a", king: false };
      else if (row >= SIZE - 3) b[row][col] = { player: "b", king: false };
    }
  }
  return b;
}

/** Single-step diagonal directions a piece may move in (forward-only for men). */
function stepDirs(piece: Piece): [number, number][] {
  const f = forwardDir(piece.player);
  const dirs: [number, number][] = piece.king ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[f, 1], [f, -1]];
  return dirs;
}

/** Every immediate single jump available for the piece at (row,col). */
function jumpsFrom(board: (Piece | null)[][], row: number, col: number): Sq[] {
  const piece = board[row][col];
  if (!piece) return [];
  const out: Sq[] = [];
  for (const [dr, dc] of stepDirs(piece)) {
    const mr = row + dr;
    const mc = col + dc;
    const lr = row + dr * 2;
    const lc = col + dc * 2;
    if (!inBounds(lr, lc)) continue;
    const mid = board[mr]?.[mc];
    if (mid && mid.player !== piece.player && board[lr][lc] === null) {
      out.push({ row: lr, col: lc });
    }
  }
  return out;
}

function simpleMovesFrom(board: (Piece | null)[][], row: number, col: number): Sq[] {
  const piece = board[row][col];
  if (!piece) return [];
  const out: Sq[] = [];
  for (const [dr, dc] of stepDirs(piece)) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && board[r][c] === null) out.push({ row: r, col: c });
  }
  return out;
}

function anyCaptureAvailable(board: (Piece | null)[][], player: Player): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (p && p.player === player && jumpsFrom(board, row, col).length > 0) return true;
    }
  }
  return false;
}

function hasAnyMove(board: (Piece | null)[][], player: Player): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p || p.player !== player) continue;
      if (jumpsFrom(board, row, col).length > 0) return true;
      if (simpleMovesFrom(board, row, col).length > 0) return true;
    }
  }
  return false;
}

function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map((row) => row.map((c) => (c ? { ...c } : null)));
}

/**
 * Legal destinations for the piece at (row,col), respecting forced capture:
 * if ANY of this player's pieces can jump, only jump destinations for pieces
 * that themselves can jump are returned (simple moves are illegal board-wide).
 */
export function checkersLegalDestinations(state: CheckersState, row: number, col: number): Sq[] {
  const piece = state.board[row]?.[col];
  if (!piece) return [];
  const mustCapture = anyCaptureAvailable(state.board, piece.player);
  const jumps = jumpsFrom(state.board, row, col);
  if (mustCapture) return jumps;
  return simpleMovesFrom(state.board, row, col);
}

export const checkersEngine: GameEngine<CheckersMove, CheckersState> = {
  kind: "checkers",

  initialState(): CheckersState {
    return { board: initialBoard(), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<CheckersState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const path = move.path;
    if (!path || path.length < 2) return { ok: false, error: "Invalid move" };

    const start = path[0];
    const board = cloneBoard(state.board);
    const piece = board[start.row]?.[start.col];
    if (!piece || piece.player !== player) return { ok: false, error: "No piece there" };

    const isJumpMove = Math.abs(path[1].row - start.row) === 2;
    const mustCapture = anyCaptureAvailable(state.board, player);
    if (mustCapture && !isJumpMove) {
      return { ok: false, error: "A capture is available and must be taken" };
    }

    let cur = start;

    if (!isJumpMove) {
      // Simple move: exactly one step, onto an empty square, correct direction.
      if (path.length !== 2) return { ok: false, error: "Invalid move" };
      const dest = path[1];
      const legal = simpleMovesFrom(board, start.row, start.col).some(
        (s) => s.row === dest.row && s.col === dest.col,
      );
      if (!legal) return { ok: false, error: "Illegal move" };
      board[dest.row][dest.col] = board[start.row][start.col];
      board[start.row][start.col] = null;
      cur = dest;
    } else {
      // Jump chain: validate + apply each hop, removing captured pieces as we go.
      let justKinged = false;
      for (let i = 1; i < path.length; i++) {
        const from = path[i - 1];
        const to = path[i];
        const dr = to.row - from.row;
        const dc = to.col - from.col;
        if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return { ok: false, error: "Illegal jump" };
        const mr = from.row + dr / 2;
        const mc = from.col + dc / 2;
        const mover = board[from.row][from.col];
        if (!mover) return { ok: false, error: "Illegal jump" };
        const midPiece = board[mr][mc];
        if (!midPiece || midPiece.player === player) return { ok: false, error: "Nothing to capture" };
        if (board[to.row][to.col] !== null) return { ok: false, error: "Landing square occupied" };
        if (!mover.king) {
          const f = forwardDir(player);
          if (Math.sign(dr) !== f) return { ok: false, error: "Men can't capture backward" };
        }
        board[to.row][to.col] = mover;
        board[from.row][from.col] = null;
        board[mr][mc] = null;
        cur = to;
        // Kinging ends the chain immediately, even mid-multi-jump.
        if (!mover.king && to.row === backRow(player)) {
          board[to.row][to.col] = { ...mover, king: true };
          justKinged = true;
          if (i !== path.length - 1) return { ok: false, error: "Move ends on kinging" };
          break;
        }
      }
      // A submitted chain may not stop early if the landing piece could still
      // capture again — UNLESS it just got kinged (that always ends the turn).
      if (!justKinged) {
        const further = jumpsFrom(board, cur.row, cur.col);
        if (further.length > 0) return { ok: false, error: "Must continue capturing with the same piece" };
      }
    }

    const notation = path.map((s) => `${String.fromCharCode(97 + s.col)}${s.row + 1}`).join(isJumpMove ? "x" : "-");
    return { ok: true, state: { board, turn: player === "a" ? "b" : "a" }, notation };
  },

  getResult(state): GameResult | null {
    const counts = { a: 0, b: 0 };
    for (const row of state.board) for (const c of row) if (c) counts[c.player]++;
    if (counts.a === 0) return { over: true, winner: "b", reason: "No pieces remaining" };
    if (counts.b === 0) return { over: true, winner: "a", reason: "No pieces remaining" };
    if (!hasAnyMove(state.board, state.turn)) {
      const winner: Player = state.turn === "a" ? "b" : "a";
      return { over: true, winner, reason: "No legal moves" };
    }
    return null;
  },

  serialize(state) {
    return state;
  },
};
