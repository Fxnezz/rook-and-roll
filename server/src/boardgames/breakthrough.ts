import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/breakthrough.ts — see there for full commentary. */
export const ROWS = 6;
export const COLS = 6;

export type Cell = Player | null;

export interface BreakthroughState {
  board: Cell[];
  turn: Player;
}

export interface BreakthroughMove {
  from: number;
  to: number;
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}
function idx(row: number, col: number): number {
  return row * COLS + col;
}
function rowOf(i: number): number {
  return Math.floor(i / COLS);
}
function colOf(i: number): number {
  return i % COLS;
}
function forwardDir(p: Player): number {
  return p === "a" ? 1 : -1;
}

function legalMovesForPiece(board: Cell[], from: number, owner: Player): number[] {
  const row = rowOf(from);
  const col = colOf(from);
  const dr = forwardDir(owner);
  const targetRow = row + dr;
  if (targetRow < 0 || targetRow >= ROWS) return [];
  const moves: number[] = [];
  const straight = idx(targetRow, col);
  if (board[straight] == null) moves.push(straight);
  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (c < 0 || c >= COLS) continue;
    const t = idx(targetRow, c);
    if (board[t] == null || board[t] === otherPlayer(owner)) moves.push(t);
  }
  return moves;
}

export const breakthroughEngine: GameEngine<BreakthroughMove, BreakthroughState> = {
  kind: "breakthrough",

  initialState(): BreakthroughState {
    const board: Cell[] = Array(ROWS * COLS).fill(null);
    for (let col = 0; col < COLS; col++) {
      board[idx(0, col)] = "a";
      board[idx(1, col)] = "a";
      board[idx(ROWS - 1, col)] = "b";
      board[idx(ROWS - 2, col)] = "b";
    }
    return { board, turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<BreakthroughState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (state.board[move.from] !== player) return { ok: false, error: "No piece there" };
    const legal = legalMovesForPiece(state.board, move.from, player);
    if (!legal.includes(move.to)) return { ok: false, error: "Illegal move" };

    const board = [...state.board];
    const captured = board[move.to] != null;
    board[move.to] = player;
    board[move.from] = null;
    const notation = `${move.from}->${move.to}${captured ? " x" : ""}`;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    for (let col = 0; col < COLS; col++) {
      if (state.board[idx(ROWS - 1, col)] === "a") return { over: true, winner: "a", reason: "Reached the far row" };
      if (state.board[idx(0, col)] === "b") return { over: true, winner: "b", reason: "Reached the far row" };
    }
    const mover = state.turn;
    const hasMove = state.board.some((c, i) => c === mover && legalMovesForPiece(state.board, i, mover).length > 0);
    if (!hasMove) return { over: true, winner: otherPlayer(mover), reason: "No legal moves" };
    return null;
  },

  serialize(state) {
    return state;
  },
};
