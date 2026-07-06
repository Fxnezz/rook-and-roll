import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/linesofaction.ts — see there for full commentary. */
export const SIZE = 8;

function idx(r: number, c: number): number {
  return r * SIZE + c;
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
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

export interface LoaState {
  board: Cell[];
  turn: Player;
}

export interface LoaMove {
  from: number;
  to: number;
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

function countLine(board: Cell[], r: number, c: number, dr: number, dc: number): number {
  let count = 1;
  let nr = r + dr;
  let nc = c + dc;
  while (inBounds(nr, nc)) {
    if (board[idx(nr, nc)] != null) count++;
    nr += dr;
    nc += dc;
  }
  nr = r - dr;
  nc = c - dc;
  while (inBounds(nr, nc)) {
    if (board[idx(nr, nc)] != null) count++;
    nr -= dr;
    nc -= dc;
  }
  return count;
}

function legalMovesForPiece(board: Cell[], from: number, player: Player): number[] {
  const r = Math.floor(from / SIZE);
  const c = from % SIZE;
  const out: number[] = [];
  for (const [dr, dc] of DIRS8) {
    const distance = countLine(board, r, c, dr, dc);
    const tr = r + dr * distance;
    const tc = c + dc * distance;
    if (!inBounds(tr, tc)) continue;
    let blocked = false;
    for (let step = 1; step < distance; step++) {
      const ir = r + dr * step;
      const ic = c + dc * step;
      const v = board[idx(ir, ic)];
      if (v != null && v !== player) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    if (board[idx(tr, tc)] === player) continue;
    out.push(idx(tr, tc));
  }
  return out;
}

function isConnected(board: Cell[], player: Player): boolean {
  const cells = board.map((c, i) => (c === player ? i : -1)).filter((i) => i >= 0);
  if (cells.length <= 1) return true;
  const visited = new Set<number>([cells[0]]);
  const stack = [cells[0]];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const r = Math.floor(cur / SIZE);
    const c = cur % SIZE;
    for (const [dr, dc] of DIRS8) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const ni = idx(nr, nc);
      if (board[ni] === player && !visited.has(ni)) {
        visited.add(ni);
        stack.push(ni);
      }
    }
  }
  return visited.size === cells.length;
}

function initialBoard(): Cell[] {
  const board: Cell[] = Array(SIZE * SIZE).fill(null);
  for (let c = 1; c < SIZE - 1; c++) {
    board[idx(0, c)] = "b";
    board[idx(SIZE - 1, c)] = "b";
  }
  for (let r = 1; r < SIZE - 1; r++) {
    board[idx(r, 0)] = "a";
    board[idx(r, SIZE - 1)] = "a";
  }
  return board;
}

export const loaEngine: GameEngine<LoaMove, LoaState> = {
  kind: "loa",

  initialState(): LoaState {
    return { board: initialBoard(), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<LoaState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (state.board[move.from] !== player) return { ok: false, error: "No piece there" };
    if (!legalMovesForPiece(state.board, move.from, player).includes(move.to)) {
      return { ok: false, error: "Illegal move" };
    }
    const board = [...state.board];
    const captured = board[move.to] != null;
    board[move.to] = player;
    board[move.from] = null;
    return {
      ok: true,
      state: { board, turn: otherPlayer(player) },
      notation: `${move.from}->${move.to}${captured ? " x" : ""}`,
    };
  },

  getResult(state): GameResult | null {
    const aConn = isConnected(state.board, "a");
    const bConn = isConnected(state.board, "b");
    if (aConn && bConn) return { over: true, winner: otherPlayer(state.turn), reason: "Both connected — last mover wins" };
    if (aConn) return { over: true, winner: "a", reason: "All pieces connected" };
    if (bConn) return { over: true, winner: "b", reason: "All pieces connected" };
    return null;
  },

  serialize(state) {
    return state;
  },
};
