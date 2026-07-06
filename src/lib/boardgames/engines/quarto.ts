import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Quarto. 16 pieces, each with 4 binary attributes encoded as bits 0-3 of an
 * id 0-15 (tall/short, dark/light, round/square, hollow/solid). Turn
 * structure is give-then-place: the mover places the piece the OPPONENT gave
 * them last turn (state.pieceInHand), then gives a new piece for the
 * opponent to place next. The very first move of the game has no piece to
 * place yet (pieceInHand is null), so it's give-only. The player who PLACES
 * a piece that completes a line of 4 sharing an attribute wins — even
 * though the opponent chose that piece.
 */
export interface QuartoState {
  board: (number | null)[]; // length 16, piece id 0-15 or null
  available: number[]; // piece ids not yet given or placed
  pieceInHand: number | null; // piece the mover must place this turn (null only pre-first-move)
  turn: Player;
}

export interface QuartoMove {
  cell: number | null; // 0-15; null only when pieceInHand is null
  give: number | null; // piece id to hand the opponent; null only when none remain
}

const LINES: number[][] = [];
for (let r = 0; r < 4; r++) LINES.push([0, 1, 2, 3].map((c) => r * 4 + c));
for (let c = 0; c < 4; c++) LINES.push([0, 1, 2, 3].map((r) => r * 4 + c));
LINES.push([0, 5, 10, 15]);
LINES.push([3, 6, 9, 12]);

function lineShares(board: (number | null)[], line: number[]): boolean {
  const vals = line.map((i) => board[i]);
  if (vals.some((v) => v == null)) return false;
  const [a, b, c, d] = vals as number[];
  const and = a & b & c & d;
  const or = a | b | c | d;
  return and !== 0 || or !== 15;
}

function boardHasQuarto(board: (number | null)[]): boolean {
  return LINES.some((line) => lineShares(board, line));
}

/** Would placing `piece` at empty `cell` complete a line? */
export function wouldQuartoWin(board: (number | null)[], cell: number, piece: number): boolean {
  const copy = [...board];
  copy[cell] = piece;
  return LINES.filter((line) => line.includes(cell)).some((line) => lineShares(copy, line));
}

export const quartoEngine: BotCapableEngine<QuartoMove, QuartoState> = {
  kind: "quarto",

  initialState(): QuartoState {
    return {
      board: Array(16).fill(null),
      available: Array.from({ length: 16 }, (_, i) => i),
      pieceInHand: null,
      turn: "a",
    };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<QuartoState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };

    let board = state.board;
    let justWon = false;
    if (state.pieceInHand != null) {
      if (move.cell == null || move.cell < 0 || move.cell > 15 || board[move.cell] != null) {
        return { ok: false, error: "Invalid cell" };
      }
      board = [...board];
      board[move.cell] = state.pieceInHand;
      justWon = boardHasQuarto(board);
    } else if (move.cell != null) {
      return { ok: false, error: "No piece to place yet" };
    }

    const boardFull = board.every((c) => c != null);
    let available = state.available;
    let pieceInHand: number | null = null;
    if (!justWon && !boardFull) {
      if (move.give == null) {
        if (available.length > 0) return { ok: false, error: "Must give a piece" };
      } else {
        if (!available.includes(move.give)) return { ok: false, error: "Piece unavailable" };
        available = available.filter((p) => p !== move.give);
        pieceInHand = move.give;
      }
    }

    const notation =
      (state.pieceInHand != null ? `place ${move.cell}` : "") +
      (move.give != null ? `${state.pieceInHand != null ? ", " : ""}give ${move.give}` : "");
    return { ok: true, state: { board, available, pieceInHand, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    if (boardHasQuarto(state.board)) {
      return { over: true, winner: otherPlayer(state.turn), reason: "Four pieces in a line share an attribute" };
    }
    if (state.board.every((c) => c != null)) return { over: true, winner: null, reason: "Board full — draw" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): QuartoMove[] {
    if (state.turn !== player) return [];
    const emptyCells = state.board.map((c, i) => (c == null ? i : -1)).filter((i) => i >= 0);
    const cells: (number | null)[] = state.pieceInHand != null ? emptyCells : [null];
    const gives: (number | null)[] = state.available.length > 0 ? state.available : [null];
    const moves: QuartoMove[] = [];
    for (const cell of cells) for (const give of gives) moves.push({ cell, give });
    return moves;
  },

  evaluate(state, player): number {
    // Symmetric threat count: lines with 3 filled cells sharing an attribute
    // (one placement away from a quarto) favor whoever places next.
    let threats = 0;
    for (const line of LINES) {
      const vals = line.map((i) => state.board[i]);
      const filled = vals.filter((v) => v != null) as number[];
      if (filled.length !== 3) continue;
      const and = filled.reduce((x, y) => x & y, 15);
      const or = filled.reduce((x, y) => x | y, 0);
      if (and !== 0 || or !== 15) threats++;
    }
    const mover = state.turn === player ? 1 : -1;
    return threats * 5 * mover;
  },
};
