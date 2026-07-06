import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/yavalath.ts — see there for full commentary. */
export const RADIUS = 4;

const CELLS: [number, number][] = [];
for (let q = -RADIUS; q <= RADIUS; q++) {
  for (let r = -RADIUS; r <= RADIUS; r++) {
    if (Math.abs(q + r) <= RADIUS) CELLS.push([q, r]);
  }
}
const CELL_INDEX = new Map<string, number>(CELLS.map(([q, r], i) => [`${q},${r}`, i]));

function cellCount(): number {
  return CELLS.length;
}
function coordOf(i: number): [number, number] {
  return CELLS[i];
}
function indexOf(q: number, r: number): number | undefined {
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

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

function lineStatus(board: Cell[], color: Player): { three: boolean; fourPlus: boolean } {
  let three = false;
  let fourPlus = false;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== color) continue;
    const [q, r] = coordOf(i);
    for (const [dq, dr] of AXES) {
      const prevIdx = indexOf(q - dq, r - dr);
      if (prevIdx != null && board[prevIdx] === color) continue;
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

export const yavalathEngine: GameEngine<YavalathMove, YavalathState> = {
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
};
