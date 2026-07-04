import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";

/**
 * Client-side port of server/src/boardgames/checkers.ts (see that file for
 * the authoritative rule commentary) plus a `generateMoves` maximal-chain
 * enumerator that the server doesn't need (it only ever validates one
 * already-chosen path from the client) but the local bot does, to compare
 * every legal full turn.
 */
export interface Piece {
  player: Player;
  king: boolean;
}

export interface CheckersState {
  board: (Piece | null)[][];
  turn: Player;
}

export interface Sq {
  row: number;
  col: number;
}

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

function stepDirs(piece: Piece): [number, number][] {
  const f = forwardDir(piece.player);
  return piece.king ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[f, 1], [f, -1]];
}

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
    if (mid && mid.player !== piece.player && board[lr][lc] === null) out.push({ row: lr, col: lc });
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
  for (let row = 0; row < SIZE; row++)
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (p && p.player === player && jumpsFrom(board, row, col).length > 0) return true;
    }
  return false;
}

function hasAnyMove(board: (Piece | null)[][], player: Player): boolean {
  for (let row = 0; row < SIZE; row++)
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p || p.player !== player) continue;
      if (jumpsFrom(board, row, col).length > 0 || simpleMovesFrom(board, row, col).length > 0) return true;
    }
  return false;
}

function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map((row) => row.map((c) => (c ? { ...c } : null)));
}

/** Applies one validated hop (simple or jump) to a board copy, handling capture + kinging. */
function applyOneHop(board: (Piece | null)[][], from: Sq, to: Sq): { board: (Piece | null)[][]; kinged: boolean } {
  const next = cloneBoard(board);
  const piece = next[from.row][from.col]!;
  const isJump = Math.abs(to.row - from.row) === 2;
  if (isJump) {
    const mr = (from.row + to.row) / 2;
    const mc = (from.col + to.col) / 2;
    next[mr][mc] = null;
  }
  next[to.row][to.col] = piece;
  next[from.row][from.col] = null;
  let kinged = false;
  if (!piece.king && to.row === backRow(piece.player)) {
    next[to.row][to.col] = { ...piece, king: true };
    kinged = true;
  }
  return { board: next, kinged };
}

/** Enumerates every maximal jump chain starting at (row,col). */
function chainsFrom(board: (Piece | null)[][], row: number, col: number, path: Sq[]): Sq[][] {
  const jumps = jumpsFrom(board, row, col);
  if (jumps.length === 0) return [path];
  const results: Sq[][] = [];
  for (const dest of jumps) {
    const { board: nb, kinged } = applyOneHop(board, { row, col }, dest);
    const nextPath = [...path, dest];
    if (kinged) {
      results.push(nextPath); // kinging always ends the chain immediately
    } else {
      results.push(...chainsFrom(nb, dest.row, dest.col, nextPath));
    }
  }
  return results;
}

export const checkersEngine: BotCapableEngine<CheckersMove, CheckersState> = {
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
    if (mustCapture && !isJumpMove) return { ok: false, error: "A capture is available and must be taken" };

    let cur = start;
    if (!isJumpMove) {
      if (path.length !== 2) return { ok: false, error: "Invalid move" };
      const dest = path[1];
      const legal = simpleMovesFrom(board, start.row, start.col).some((s) => s.row === dest.row && s.col === dest.col);
      if (!legal) return { ok: false, error: "Illegal move" };
      board[dest.row][dest.col] = board[start.row][start.col];
      board[start.row][start.col] = null;
      cur = dest;
    } else {
      let justKingedFlag = false;
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
        if (!mover.king && to.row === backRow(player)) {
          board[to.row][to.col] = { ...mover, king: true };
          justKingedFlag = true;
          if (i !== path.length - 1) return { ok: false, error: "Move ends on kinging" };
          break;
        }
      }
      if (!justKingedFlag) {
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
      return { over: true, winner: otherPlayerOf(state.turn), reason: "No legal moves" };
    }
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): CheckersMove[] {
    const mustCapture = anyCaptureAvailable(state.board, player);
    const moves: CheckersMove[] = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const p = state.board[row][col];
        if (!p || p.player !== player) continue;
        if (mustCapture) {
          if (jumpsFrom(state.board, row, col).length === 0) continue;
          for (const chain of chainsFrom(state.board, row, col, [{ row, col }])) {
            if (chain.length > 1) moves.push({ path: chain });
          }
        } else {
          for (const dest of simpleMovesFrom(state.board, row, col)) {
            moves.push({ path: [{ row, col }, dest] });
          }
        }
      }
    }
    return moves;
  },

  evaluate(state, player): number {
    const opp = otherPlayerOf(player);
    let score = 0;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const p = state.board[row][col];
        if (!p) continue;
        const base = p.king ? 5 : 3;
        // Encourage men to advance toward the back row (closer to kinging).
        const advancement = p.king ? 0 : (p.player === "a" ? row : SIZE - 1 - row) * 0.1;
        const centerBonus = (col >= 2 && col <= 5 ? 0.2 : 0);
        const v = base + advancement + centerBonus;
        score += p.player === player ? v : -v;
        void opp;
      }
    }
    return score;
  },
};

function otherPlayerOf(p: Player): Player {
  return p === "a" ? "b" : "a";
}

/** Client-side legal-destination hints for the interactive board UI. */
export function checkersLegalDestinations(state: CheckersState, row: number, col: number): Sq[] {
  const piece = state.board[row]?.[col];
  if (!piece) return [];
  const mustCapture = anyCaptureAvailable(state.board, piece.player);
  const jumps = jumpsFrom(state.board, row, col);
  return mustCapture ? jumps : simpleMovesFrom(state.board, row, col);
}
