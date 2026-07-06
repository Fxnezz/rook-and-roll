import type { Player } from "../engines/types";
import { wouldQuartoWin, type QuartoMove, type QuartoState } from "../engines/quarto";

/**
 * Quarto's branching factor (empty cells × available pieces, both up to 16)
 * makes generic negamax impractical at any useful depth, and the give-then-
 * place turn structure means "whose piece is it" isn't a meaningful notion —
 * so a direct heuristic bot beats a shallow generic search here, the same
 * call made for Nim (perfect nim-sum play) and Pentago (huge branching).
 *
 * Strategy: place a winning piece immediately if one exists. Otherwise place
 * to maximize the number of "safe" pieces left to give (pieces that can't
 * complete a line no matter where the opponent puts them). Then give a safe
 * piece if one exists, else any piece (a loss is already unavoidable).
 */
function emptyCells(board: (number | null)[]): number[] {
  return board.map((c, i) => (c == null ? i : -1)).filter((i) => i >= 0);
}

function safePieces(board: (number | null)[], cells: number[], pieces: number[]): number[] {
  return pieces.filter((p) => !cells.some((cell) => wouldQuartoWin(board, cell, p)));
}

export function pickQuartoMove(state: QuartoState, player: Player): QuartoMove | null {
  if (state.turn !== player) return null;

  let cell: number | null = null;
  let boardAfter = state.board;

  if (state.pieceInHand != null) {
    const cells = emptyCells(state.board);
    if (cells.length === 0) return null;
    const winCell = cells.find((c) => wouldQuartoWin(state.board, c, state.pieceInHand!));
    if (winCell != null) {
      cell = winCell;
    } else {
      let bestCell = cells[0];
      let bestSafeCount = -1;
      for (const c of cells) {
        const after = [...state.board];
        after[c] = state.pieceInHand;
        const cellsAfter = emptyCells(after);
        const count = safePieces(after, cellsAfter, state.available).length;
        if (count > bestSafeCount) {
          bestSafeCount = count;
          bestCell = c;
        }
      }
      cell = bestCell;
    }
    boardAfter = [...state.board];
    boardAfter[cell] = state.pieceInHand;
  }

  const cellsAfter = emptyCells(boardAfter);
  let give: number | null = null;
  if (state.available.length > 0 && cellsAfter.length > 0) {
    const safe = safePieces(boardAfter, cellsAfter, state.available);
    const pool = safe.length > 0 ? safe : state.available;
    give = pool[0];
  }

  return { cell, give };
}
