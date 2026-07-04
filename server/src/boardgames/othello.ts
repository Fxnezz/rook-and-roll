import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/**
 * Othello / Reversi, 8x8. Player "a" is Black and moves first; "b" is White.
 * A placement must flank at least one line of the opponent's discs between
 * the new disc and an existing disc of the mover's own color, in any of the
 * 8 directions — every flanked disc in every valid direction flips.
 *
 * Othello has a "forced pass": if the side to move has no legal placement,
 * they must pass instead of placing. This engine models a pass as an
 * explicit move (`{ pass: true }`) rather than an implicit server-side
 * turn-skip, purely so the client-side mirror (src/lib/boardgames/engines/
 * othello.ts) stays compatible with the shared negamax bot, which expects
 * `generateMoves` to return the pass as a normal legal move for whoever is
 * actually unable to place. See that file for the full rationale. The server
 * doesn't run the bot, but keeps the same move shape since MatchRoom treats
 * a move as fully opaque (`unknown`) and both sides must agree on its shape.
 */
export type Cell = Player | null;

export interface OthelloState {
  board: Cell[][];
  turn: Player;
  lastPassBy: Player | null;
}

export interface Sq {
  row: number;
  col: number;
}

export type OthelloMove = { row: number; col: number } | { pass: true };

const SIZE = 8;
const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function initialBoard(): Cell[][] {
  const b = emptyBoard();
  b[3][3] = "b";
  b[3][4] = "a";
  b[4][3] = "a";
  b[4][4] = "b";
  return b;
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => [...row]);
}

function flipsForMove(board: Cell[][], player: Player, row: number, col: number): Sq[] {
  if (board[row][col] !== null) return [];
  const opp = otherPlayer(player);
  const flips: Sq[] = [];
  for (const [dr, dc] of DIRS) {
    const line: Sq[] = [];
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === opp) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    if (line.length > 0 && inBounds(r, c) && board[r][c] === player) flips.push(...line);
  }
  return flips;
}

function hasLegalMove(board: Cell[][], player: Player): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (flipsForMove(board, player, row, col).length > 0) return true;
    }
  }
  return false;
}

function countDiscs(board: Cell[][]): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const row of board) for (const c of row) { if (c === "a") a++; else if (c === "b") b++; }
  return { a, b };
}

export const othelloEngine: GameEngine<OthelloMove, OthelloState> = {
  kind: "othello",

  initialState(): OthelloState {
    return { board: initialBoard(), turn: "a", lastPassBy: null };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<OthelloState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };

    if (!("row" in move)) {
      if (hasLegalMove(state.board, player)) {
        return { ok: false, error: "You have a legal move and must play it" };
      }
      return { ok: true, state: { board: state.board, turn: otherPlayer(player), lastPassBy: player }, notation: "pass" };
    }

    const { row, col } = move;
    if (row == null || col == null || !inBounds(row, col)) return { ok: false, error: "Off the board" };
    const flips = flipsForMove(state.board, player, row, col);
    if (flips.length === 0) return { ok: false, error: "Illegal move — no discs would be captured" };

    const board = cloneBoard(state.board);
    board[row][col] = player;
    for (const f of flips) board[f.row][f.col] = player;

    const notation = `${String.fromCharCode(97 + col)}${row + 1}`;
    return { ok: true, state: { board, turn: otherPlayer(player), lastPassBy: null }, notation };
  },

  getResult(state): GameResult | null {
    if (hasLegalMove(state.board, "a") || hasLegalMove(state.board, "b")) return null;
    const counts = countDiscs(state.board);
    if (counts.a === counts.b) return { over: true, winner: null, reason: `Board settled ${counts.a}–${counts.b}` };
    return { over: true, winner: counts.a > counts.b ? "a" : "b", reason: `${counts.a}–${counts.b} discs` };
  },

  serialize(state) {
    return state;
  },
};
