import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Y: a triangular hex-grid board (side 8, 36 cells), no captures. Whoever
 * forms a single connected group of their own stones that touches all
 * three sides of the triangle wins. Y is the more fundamental connection
 * game Hex is a special case of, and it shares Hex's guarantee that a
 * completely full board can never be a draw — exactly one side will always
 * have a connected group touching all three edges.
 */
export const N = 8;

const CELLS: [number, number][] = [];
for (let row = 0; row < N; row++) {
  for (let col = 0; col <= row; col++) CELLS.push([row, col]);
}
const CELL_INDEX = new Map<string, number>(CELLS.map(([r, c], i) => [`${r},${c}`, i]));

export function cellCount(): number {
  return CELLS.length;
}
export function coordOf(i: number): [number, number] {
  return CELLS[i];
}

const NEIGHBOR_OFFSETS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [0, -1],
  [0, 1],
  [1, 0],
  [1, 1],
];

function neighborsOf(i: number): number[] {
  const [r, c] = CELLS[i];
  const out: number[] = [];
  for (const [dr, dc] of NEIGHBOR_OFFSETS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= N || nc < 0 || nc > nr) continue;
    const idx = CELL_INDEX.get(`${nr},${nc}`);
    if (idx != null) out.push(idx);
  }
  return out;
}

type Side = "left" | "right" | "bottom";
function sidesOf(i: number): Side[] {
  const [r, c] = CELLS[i];
  const sides: Side[] = [];
  if (c === 0) sides.push("left");
  if (c === r) sides.push("right");
  if (r === N - 1) sides.push("bottom");
  return sides;
}

export type Cell = Player | null;

export interface YGameState {
  board: Cell[];
  turn: Player;
}

export interface YGameMove {
  cell: number;
}

function hasWinningGroup(board: Cell[], player: Player): boolean {
  const visited = new Array(board.length).fill(false);
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== player || visited[i]) continue;
    const sides = new Set<Side>();
    const stack = [i];
    visited[i] = true;
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const s of sidesOf(cur)) sides.add(s);
      for (const n of neighborsOf(cur)) {
        if (board[n] === player && !visited[n]) {
          visited[n] = true;
          stack.push(n);
        }
      }
    }
    if (sides.size === 3) return true;
  }
  return false;
}

export const yGameEngine: BotCapableEngine<YGameMove, YGameState> = {
  kind: "ygame",

  initialState(): YGameState {
    return { board: Array(cellCount()).fill(null), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<YGameState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (move.cell < 0 || move.cell >= state.board.length || state.board[move.cell] != null) {
      return { ok: false, error: "Occupied" };
    }
    const board = [...state.board];
    board[move.cell] = player;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation: `cell ${move.cell}` };
  },

  getResult(state): GameResult | null {
    if (hasWinningGroup(state.board, "a")) return { over: true, winner: "a", reason: "Connected all three sides" };
    if (hasWinningGroup(state.board, "b")) return { over: true, winner: "b", reason: "Connected all three sides" };
    if (state.board.every((c) => c != null)) return { over: true, winner: null, reason: "Board full" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): YGameMove[] {
    if (state.turn !== player) return [];
    return state.board.map((c, i) => (c == null ? i : -1)).filter((i) => i >= 0).map((cell) => ({ cell }));
  },

  evaluate(state, player): number {
    const opponent = otherPlayer(player);
    const score = (who: Player) => {
      const sides = new Set<Side>();
      let count = 0;
      state.board.forEach((c, i) => {
        if (c !== who) return;
        count++;
        for (const s of sidesOf(i)) sides.add(s);
      });
      return count + sides.size * 3;
    };
    return score(player) - score(opponent);
  },
};
