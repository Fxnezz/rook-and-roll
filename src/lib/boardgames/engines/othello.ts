import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Client-side mirror of server/src/boardgames/othello.ts (see that file for
 * the authoritative rule commentary) plus `generateMoves`/`evaluate` the
 * local bot needs.
 *
 * Unlike the other three board games, Othello has a "forced pass": if the
 * side to move has no legal placement, they must pass instead. To keep this
 * compatible with the shared negamax bot (src/lib/boardgames/bots/minimax.ts),
 * which strictly alternates "a"/"b" each ply and treats an empty move list as
 * a leaf node, a pass is modeled as an explicit, always-legal move rather
 * than an implicit turn-skip — `generateMoves` falls back to `[{ pass: true }]`
 * whenever the side to move has no real placement, so the move list is never
 * empty except at a true game end (which `getResult` catches first).
 */
export type Cell = Player | null;

export interface OthelloState {
  board: Cell[][]; // [row][col], 8x8
  turn: Player;
  /** cosmetic only: who was last forced to pass, for a UI toast — cleared on any placement */
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

/** Every cell that would flip if `player` placed a disc at (row,col); empty if illegal. */
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

interface LegalMove extends Sq {
  flips: Sq[];
}

function legalMovesFor(board: Cell[][], player: Player): LegalMove[] {
  const moves: LegalMove[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const flips = flipsForMove(board, player, row, col);
      if (flips.length > 0) moves.push({ row, col, flips });
    }
  }
  return moves;
}

function countDiscs(board: Cell[][]): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const row of board) for (const c of row) { if (c === "a") a++; else if (c === "b") b++; }
  return { a, b };
}

/** Client-side legal-destination hints for the interactive board UI. */
export function othelloLegalMoves(state: OthelloState, player: Player): Sq[] {
  return legalMovesFor(state.board, player).map((m) => ({ row: m.row, col: m.col }));
}

const CORNERS: Sq[] = [{ row: 0, col: 0 }, { row: 0, col: 7 }, { row: 7, col: 0 }, { row: 7, col: 7 }];
const X_SQUARE: Record<string, Sq> = {
  "0,0": { row: 1, col: 1 },
  "0,7": { row: 1, col: 6 },
  "7,0": { row: 6, col: 1 },
  "7,7": { row: 6, col: 6 },
};
const C_SQUARES: Record<string, Sq[]> = {
  "0,0": [{ row: 0, col: 1 }, { row: 1, col: 0 }],
  "0,7": [{ row: 0, col: 6 }, { row: 1, col: 7 }],
  "7,0": [{ row: 7, col: 1 }, { row: 6, col: 0 }],
  "7,7": [{ row: 7, col: 6 }, { row: 6, col: 7 }],
};

export const othelloEngine: BotCapableEngine<OthelloMove, OthelloState> = {
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
      if (legalMovesFor(state.board, player).length > 0) {
        return { ok: false, error: "You have a legal move and must play it" };
      }
      return { ok: true, state: { board: state.board, turn: otherPlayer(player), lastPassBy: player }, notation: "pass" };
    }

    const { row, col } = move;
    if (!inBounds(row, col)) return { ok: false, error: "Off the board" };
    const flips = flipsForMove(state.board, player, row, col);
    if (flips.length === 0) return { ok: false, error: "Illegal move — no discs would be captured" };

    const board = cloneBoard(state.board);
    board[row][col] = player;
    for (const f of flips) board[f.row][f.col] = player;

    const notation = `${String.fromCharCode(97 + col)}${row + 1}`;
    return { ok: true, state: { board, turn: otherPlayer(player), lastPassBy: null }, notation };
  },

  getResult(state): GameResult | null {
    const aHas = legalMovesFor(state.board, "a").length > 0;
    const bHas = legalMovesFor(state.board, "b").length > 0;
    if (aHas || bHas) return null;
    const counts = countDiscs(state.board);
    if (counts.a === counts.b) return { over: true, winner: null, reason: `Board settled ${counts.a}–${counts.b}` };
    return { over: true, winner: counts.a > counts.b ? "a" : "b", reason: `${counts.a}–${counts.b} discs` };
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): OthelloMove[] {
    const real = legalMovesFor(state.board, player);
    if (real.length > 0) return real.map((m) => ({ row: m.row, col: m.col }));
    return [{ pass: true }];
  },

  evaluate(state, player): number {
    const opp = otherPlayer(player);
    const board = state.board;

    let corner = 0;
    let xRisk = 0;
    let cRisk = 0;
    for (const { row, col } of CORNERS) {
      const key = `${row},${col}`;
      const occ = board[row][col];
      if (occ === player) corner += 1;
      else if (occ === opp) corner -= 1;
      else {
        const x = X_SQUARE[key];
        const xOcc = board[x.row][x.col];
        if (xOcc === player) xRisk -= 1;
        else if (xOcc === opp) xRisk += 1;
        for (const cs of C_SQUARES[key]) {
          const cOcc = board[cs.row][cs.col];
          if (cOcc === player) cRisk -= 1;
          else if (cOcc === opp) cRisk += 1;
        }
      }
    }

    let discA = 0;
    let discB = 0;
    let empty = 0;
    let frontier = 0;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const v = board[row][col];
        if (v === null) { empty++; continue; }
        if (v === "a") discA++; else discB++;
        let isFrontier = false;
        for (const [dr, dc] of DIRS) {
          const nr = row + dr;
          const nc = col + dc;
          if (inBounds(nr, nc) && board[nr][nc] === null) { isFrontier = true; break; }
        }
        if (isFrontier) frontier += v === player ? -1 : 1;
      }
    }
    const discDiff = player === "a" ? discA - discB : discB - discA;

    const myMoves = legalMovesFor(board, player).length;
    const oppMoves = legalMovesFor(board, opp).length;
    const mobility = myMoves - oppMoves;

    const phase = (SIZE * SIZE - empty) / (SIZE * SIZE);
    const discWeight = phase * 10;

    return corner * 30 + xRisk * 15 + cRisk * 8 + mobility * 4 + frontier * 2 + discDiff * discWeight;
  },
};
