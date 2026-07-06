import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Lines of Action, 8x8 board. Black ("b") starts on the top/bottom edge
 * rows, White ("a") on the left/right edge columns, 12 pieces each. A piece
 * moves in a straight line exactly as many squares as the total number of
 * pieces (both colors) anywhere on that entire row/column/diagonal —
 * jumping over own pieces along the way is fine, but an enemy piece
 * anywhere on the path (except exactly at the landing square, which
 * captures it) blocks the move. First player to get all their own pieces
 * into one 8-connected group wins; if a move connects both sides at once,
 * whoever just moved wins.
 */
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

function dispersion(board: Cell[], player: Player): number {
  const cells = board.map((c, i) => (c === player ? i : -1)).filter((i) => i >= 0);
  if (cells.length <= 1) return 0;
  const rows = cells.map((i) => Math.floor(i / SIZE));
  const cols = cells.map((i) => i % SIZE);
  const centR = rows.reduce((a, b) => a + b, 0) / rows.length;
  const centC = cols.reduce((a, b) => a + b, 0) / cols.length;
  return rows.reduce((sum, r, i) => sum + Math.abs(r - centR) + Math.abs(cols[i] - centC), 0);
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

export const loaEngine: BotCapableEngine<LoaMove, LoaState> = {
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

  generateMoves(state, player): LoaMove[] {
    if (state.turn !== player) return [];
    const moves: LoaMove[] = [];
    state.board.forEach((c, from) => {
      if (c !== player) return;
      for (const to of legalMovesForPiece(state.board, from, player)) moves.push({ from, to });
    });
    return moves;
  },

  evaluate(state, player): number {
    const opponent = otherPlayer(player);
    return dispersion(state.board, opponent) - dispersion(state.board, player);
  },
};
