import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Halma (mini 2-player version): 7x7 board, each side starts with 6 pieces
 * in a small triangular corner camp and must move them all into the
 * opposite corner (the other side's starting camp) to win. A piece moves
 * one step to an adjacent empty cell (any of 8 directions) or jumps in a
 * straight line over any adjacent piece (own or opponent's — jumps never
 * capture) into the empty cell just beyond. Chained multi-jumps aren't
 * modeled here (single jump per turn) to keep move generation tractable.
 */
export const SIZE = 7;

function idx(row: number, col: number): number {
  return row * SIZE + col;
}

const CAMP_A: number[] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 1],
  [2, 0],
].map(([r, c]) => idx(r, c));

const CAMP_B: number[] = [
  [SIZE - 1, SIZE - 1],
  [SIZE - 1, SIZE - 2],
  [SIZE - 1, SIZE - 3],
  [SIZE - 2, SIZE - 1],
  [SIZE - 2, SIZE - 2],
  [SIZE - 3, SIZE - 1],
].map(([r, c]) => idx(r, c));

function startCampFor(player: Player): number[] {
  return player === "a" ? CAMP_A : CAMP_B;
}
function targetCampFor(player: Player): number[] {
  return player === "a" ? CAMP_B : CAMP_A;
}

export type Cell = Player | null;

export interface HalmaState {
  board: Cell[];
  turn: Player;
}

export interface HalmaMove {
  from: number;
  to: number;
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

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function legalDestinations(board: Cell[], from: number): number[] {
  const row = Math.floor(from / SIZE);
  const col = from % SIZE;
  const dests: number[] = [];
  for (const [dr, dc] of DIRS8) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;
    const nIdx = idx(nr, nc);
    if (board[nIdx] == null) {
      dests.push(nIdx);
    } else {
      const jr = nr + dr;
      const jc = nc + dc;
      if (inBounds(jr, jc) && board[idx(jr, jc)] == null) dests.push(idx(jr, jc));
    }
  }
  return dests;
}

function chebyshev(a: number, b: number): number {
  const ar = Math.floor(a / SIZE);
  const ac = a % SIZE;
  const br = Math.floor(b / SIZE);
  const bc = b % SIZE;
  return Math.max(Math.abs(ar - br), Math.abs(ac - bc));
}

function totalDistanceToTarget(board: Cell[], player: Player): number {
  const targets = targetCampFor(player);
  let total = 0;
  board.forEach((c, i) => {
    if (c !== player) return;
    total += Math.min(...targets.map((t) => chebyshev(i, t)));
  });
  return total;
}

export const halmaEngine: BotCapableEngine<HalmaMove, HalmaState> = {
  kind: "halma",

  initialState(): HalmaState {
    const board: Cell[] = Array(SIZE * SIZE).fill(null);
    for (const c of CAMP_A) board[c] = "a";
    for (const c of CAMP_B) board[c] = "b";
    return { board, turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<HalmaState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (state.board[move.from] !== player) return { ok: false, error: "No piece there" };
    if (!legalDestinations(state.board, move.from).includes(move.to)) return { ok: false, error: "Illegal move" };

    const board = [...state.board];
    board[move.to] = player;
    board[move.from] = null;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation: `${move.from}->${move.to}` };
  },

  getResult(state): GameResult | null {
    for (const player of ["a", "b"] as Player[]) {
      const target = targetCampFor(player);
      if (target.every((c) => state.board[c] === player)) {
        return { over: true, winner: player, reason: "All pieces reached the far camp" };
      }
    }
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): HalmaMove[] {
    if (state.turn !== player) return [];
    const moves: HalmaMove[] = [];
    state.board.forEach((c, from) => {
      if (c !== player) return;
      for (const to of legalDestinations(state.board, from)) moves.push({ from, to });
    });
    return moves;
  },

  evaluate(state, player): number {
    const opponent = otherPlayer(player);
    return totalDistanceToTarget(state.board, opponent) - totalDistanceToTarget(state.board, player);
  },
};

export { startCampFor, targetCampFor };
