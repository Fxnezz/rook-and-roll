import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Breakthrough, played on a 6x6 board (a smaller variant of the standard
 * 8x8/7x7 game, chosen to keep the bot's search fast). Each side starts with
 * two full rows of pawns. Pawns move one square straight forward only onto
 * an empty square, or one square diagonally forward onto an empty square OR
 * to capture an opponent pawn there. First pawn to reach the opponent's home
 * row wins; a player with no legal moves also loses.
 */
export const ROWS = 6;
export const COLS = 6;

export type Cell = Player | null;

export interface BreakthroughState {
  board: Cell[]; // row-major, length ROWS*COLS; row 0 = a's home row, row ROWS-1 = b's home row
  turn: Player;
}

export interface BreakthroughMove {
  from: number; // index into board
  to: number;
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
function advancement(p: Player, row: number): number {
  return p === "a" ? row : ROWS - 1 - row;
}

function legalMovesForPiece(board: Cell[], from: number, owner: Player): number[] {
  const row = rowOf(from);
  const col = colOf(from);
  const dr = forwardDir(owner);
  const targetRow = row + dr;
  if (targetRow < 0 || targetRow >= ROWS) return [];
  const moves: number[] = [];
  // Straight: only onto empty.
  const straight = idx(targetRow, col);
  if (board[straight] == null) moves.push(straight);
  // Diagonals: onto empty or capturing an opponent piece.
  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (c < 0 || c >= COLS) continue;
    const t = idx(targetRow, c);
    if (board[t] == null || board[t] === otherPlayer(owner)) moves.push(t);
  }
  return moves;
}

export const breakthroughEngine: BotCapableEngine<BreakthroughMove, BreakthroughState> = {
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

  generateMoves(state, player): BreakthroughMove[] {
    if (state.turn !== player) return [];
    const moves: BreakthroughMove[] = [];
    state.board.forEach((c, from) => {
      if (c !== player) return;
      for (const to of legalMovesForPiece(state.board, from, player)) moves.push({ from, to });
    });
    return moves;
  },

  evaluate(state, player): number {
    let score = 0;
    state.board.forEach((c, i) => {
      if (c == null) return;
      const value = 10 + advancement(c, rowOf(i));
      score += c === player ? value : -value;
    });
    return score;
  },
};
