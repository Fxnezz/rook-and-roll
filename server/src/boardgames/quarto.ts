import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/quarto.ts — see there for full commentary. */
export interface QuartoState {
  board: (number | null)[];
  available: number[];
  pieceInHand: number | null;
  turn: Player;
}

export interface QuartoMove {
  cell: number | null;
  give: number | null;
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
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

export const quartoEngine: GameEngine<QuartoMove, QuartoState> = {
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
};
