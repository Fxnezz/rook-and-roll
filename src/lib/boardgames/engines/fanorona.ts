import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Fanorona (Madagascar), standard 5x9 board (45 points). Diagonal lines only
 * connect points where row+col is even (orthogonal lines connect everywhere)
 * — this is the real board's lattice pattern. A move slides one piece to an
 * adjacent empty point; if the point just beyond the destination (same
 * direction) holds enemy pieces, they're captured ("approach"), or if the
 * point just behind the origin (opposite direction) holds enemy pieces,
 * those are captured instead ("withdrawal") — capturing is compulsory
 * whenever available, and the player picks which direction if both apply.
 * Chained multi-captures in one turn aren't modeled here (single capture
 * per move) to keep this tractable, the same simplification made for
 * Halma's jumps.
 */
export const ROWS = 5;
export const COLS = 9;

function idx(r: number, c: number): number {
  return r * COLS + c;
}
function rc(i: number): [number, number] {
  return [Math.floor(i / COLS), i % COLS];
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}
function validDirection(r: number, c: number, dr: number, dc: number): boolean {
  if (dr === 0 || dc === 0) return true;
  return (r + c) % 2 === 0;
}

const DIRS8: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export type Cell = Player | null;

export interface FanoronaState {
  board: Cell[];
  turn: Player;
}

export interface FanoronaMove {
  from: number;
  to: number;
  captureDir?: "approach" | "withdrawal";
}

function runCaptures(board: Cell[], r: number, c: number, dr: number, dc: number, enemy: Player): number[] {
  const captured: number[] = [];
  let nr = r + dr;
  let nc = c + dc;
  while (inBounds(nr, nc) && board[idx(nr, nc)] === enemy) {
    captured.push(idx(nr, nc));
    nr += dr;
    nc += dc;
  }
  return captured;
}

interface Candidate {
  move: FanoronaMove;
  captured: number[];
}

function allCandidates(state: FanoronaState, player: Player): Candidate[] {
  const opponent = otherPlayer(player);
  const out: Candidate[] = [];
  for (let cell = 0; cell < state.board.length; cell++) {
    if (state.board[cell] !== player) continue;
    const [r, c] = rc(cell);
    for (const [dr, dc] of DIRS8) {
      if (!validDirection(r, c, dr, dc)) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc) || state.board[idx(nr, nc)] != null) continue;
      const to = idx(nr, nc);
      const approach = runCaptures(state.board, nr, nc, dr, dc, opponent);
      const withdrawal = runCaptures(state.board, r, c, -dr, -dc, opponent);
      if (approach.length > 0) out.push({ move: { from: cell, to, captureDir: "approach" }, captured: approach });
      if (withdrawal.length > 0) out.push({ move: { from: cell, to, captureDir: "withdrawal" }, captured: withdrawal });
      if (approach.length === 0 && withdrawal.length === 0) out.push({ move: { from: cell, to }, captured: [] });
    }
  }
  const hasCapture = out.some((c) => c.captured.length > 0);
  return hasCapture ? out.filter((c) => c.captured.length > 0) : out;
}

function initialBoard(): Cell[] {
  const board: Cell[] = Array(ROWS * COLS).fill(null);
  for (let c = 0; c < COLS; c++) {
    board[idx(0, c)] = "b";
    board[idx(1, c)] = "b";
    board[idx(ROWS - 1, c)] = "a";
    board[idx(ROWS - 2, c)] = "a";
  }
  const mid = 2;
  const pattern: (Player | null)[] = ["a", "b", "a", "b", null, "b", "a", "b", "a"];
  for (let c = 0; c < COLS; c++) board[idx(mid, c)] = pattern[c];
  return board;
}

export const fanoronaEngine: BotCapableEngine<FanoronaMove, FanoronaState> = {
  kind: "fanorona",

  initialState(): FanoronaState {
    return { board: initialBoard(), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<FanoronaState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const candidates = allCandidates(state, player);
    const match = candidates.find(
      (c) => c.move.from === move.from && c.move.to === move.to && c.move.captureDir === move.captureDir,
    );
    if (!match) return { ok: false, error: "Illegal move" };

    const board = [...state.board];
    board[move.to] = player;
    board[move.from] = null;
    for (const cap of match.captured) board[cap] = null;
    const notation = `${move.from}->${move.to}${match.captured.length ? ` x${match.captured.length}` : ""}`;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    const aCount = state.board.filter((c) => c === "a").length;
    const bCount = state.board.filter((c) => c === "b").length;
    if (aCount === 0) return { over: true, winner: "b", reason: "No pieces left" };
    if (bCount === 0) return { over: true, winner: "a", reason: "No pieces left" };
    const mover = state.turn;
    if (allCandidates(state, mover).length === 0) {
      return { over: true, winner: otherPlayer(mover), reason: "No legal moves" };
    }
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): FanoronaMove[] {
    if (state.turn !== player) return [];
    return allCandidates(state, player).map((c) => c.move);
  },

  evaluate(state, player): number {
    const opponent = otherPlayer(player);
    const mine = state.board.filter((c) => c === player).length;
    const theirs = state.board.filter((c) => c === opponent).length;
    return mine - theirs;
  },
};
