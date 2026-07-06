import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Yavalath, on a hexagonal board of radius 4 (61 cells, axial coordinates).
 * Placing stones only — no removal. An unbroken line of exactly 3 of your
 * own stones LOSES the game for you, unless that same move also completes a
 * line of 4 or more (which wins outright, overriding the 3-in-a-row loss).
 */
export const RADIUS = 4;

const CELLS: [number, number][] = [];
for (let q = -RADIUS; q <= RADIUS; q++) {
  for (let r = -RADIUS; r <= RADIUS; r++) {
    if (Math.abs(q + r) <= RADIUS) CELLS.push([q, r]);
  }
}
const CELL_INDEX = new Map<string, number>(CELLS.map(([q, r], i) => [`${q},${r}`, i]));

export function cellCount(): number {
  return CELLS.length;
}
export function coordOf(i: number): [number, number] {
  return CELLS[i];
}
export function indexOf(q: number, r: number): number | undefined {
  return CELL_INDEX.get(`${q},${r}`);
}

const AXES: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, -1],
];

export type Cell = Player | null;

export interface YavalathState {
  board: Cell[];
  turn: Player;
}

export interface YavalathMove {
  cell: number;
}

function lineStatus(board: Cell[], color: Player): { three: boolean; fourPlus: boolean } {
  let three = false;
  let fourPlus = false;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== color) continue;
    const [q, r] = coordOf(i);
    for (const [dq, dr] of AXES) {
      const prevIdx = indexOf(q - dq, r - dr);
      if (prevIdx != null && board[prevIdx] === color) continue; // not a run start
      let len = 1;
      let nq = q + dq;
      let nr = r + dr;
      let idx = indexOf(nq, nr);
      while (idx != null && board[idx] === color) {
        len++;
        nq += dq;
        nr += dr;
        idx = indexOf(nq, nr);
      }
      if (len === 3) three = true;
      if (len >= 4) fourPlus = true;
    }
  }
  return { three, fourPlus };
}

function wouldLose(board: Cell[], cell: number, color: Player): boolean {
  const copy = [...board];
  copy[cell] = color;
  const status = lineStatus(copy, color);
  return status.three && !status.fourPlus;
}

export const yavalathEngine: BotCapableEngine<YavalathMove, YavalathState> = {
  kind: "yavalath",

  initialState(): YavalathState {
    return { board: Array(cellCount()).fill(null), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<YavalathState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (move.cell < 0 || move.cell >= state.board.length || state.board[move.cell] != null) {
      return { ok: false, error: "Occupied" };
    }
    const board = [...state.board];
    board[move.cell] = player;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation: `cell ${move.cell}` };
  },

  getResult(state): GameResult | null {
    for (const player of ["a", "b"] as Player[]) {
      const status = lineStatus(state.board, player);
      if (status.fourPlus) return { over: true, winner: player, reason: "Made a line of four or more" };
    }
    for (const player of ["a", "b"] as Player[]) {
      const status = lineStatus(state.board, player);
      if (status.three) return { over: true, winner: otherPlayer(player), reason: "Opponent made an unbroken three" };
    }
    if (state.board.every((c) => c != null)) return { over: true, winner: null, reason: "Board full" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): YavalathMove[] {
    if (state.turn !== player) return [];
    return state.board.map((c, i) => (c == null ? i : -1)).filter((i) => i >= 0).map((cell) => ({ cell }));
  },

  evaluate(state, player): number {
    const opponent = otherPlayer(player);
    const empties = state.board.map((c, i) => (c == null ? i : -1)).filter((i) => i >= 0);
    const safeForMe = empties.filter((c) => !wouldLose(state.board, c, player)).length;
    const safeForThem = empties.filter((c) => !wouldLose(state.board, c, opponent)).length;
    return safeForMe - safeForThem;
  },
};
