import type { Player } from "../engines/types";
import { otherPlayer } from "../engines/types";
import { SIZE, type Cell, type Connect6Move, type Connect6State } from "../engines/connect6";

/**
 * Connect6's two-stones-per-turn structure means a legal "move" is a pair of
 * cells — searching all pairs (hundreds of candidates squared) is too slow
 * for generic negamax, so this bot picks each stone greedily instead: score
 * every candidate cell by how much it helps the mover's own lines and how
 * much it would have helped the opponent (occupying good intersections),
 * place the best one, then repeat once more against the updated board for
 * the second stone (same call made for Quarto's and Pentago's bots).
 */
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function lineScore(len: number, openEnds: number): number {
  if (len >= 6) return 1_000_000;
  if (len === 5) return openEnds >= 1 ? 100_000 : 500;
  if (len === 4) return openEnds === 2 ? 5_000 : openEnds === 1 ? 300 : 0;
  if (len === 3) return openEnds === 2 ? 500 : openEnds === 1 ? 50 : 0;
  if (len === 2) return openEnds === 2 ? 30 : 5;
  if (len === 1) return openEnds === 2 ? 2 : 0;
  return 0;
}

function cellScore(board: Cell[][], row: number, col: number, color: Player): number {
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let len = 1;
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === color) {
      len++;
      r += dr;
      c += dc;
    }
    const openEnd = inBounds(r, c) && board[r][c] === null;
    let r2 = row - dr;
    let c2 = col - dc;
    while (inBounds(r2, c2) && board[r2][c2] === color) {
      len++;
      r2 -= dr;
      c2 -= dc;
    }
    const openStart = inBounds(r2, c2) && board[r2][c2] === null;
    total += lineScore(len, (openStart ? 1 : 0) + (openEnd ? 1 : 0));
  }
  return total;
}

function candidateCells(board: Cell[][]): { row: number; col: number }[] {
  const has = board.some((row) => row.some((c) => c !== null));
  if (!has) return [{ row: 7, col: 7 }];
  const seen = new Set<string>();
  const out: { row: number; col: number }[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === null) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (!inBounds(r, c) || board[r][c] !== null) continue;
          const key = `${r},${c}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ row: r, col: c });
          }
        }
      }
    }
  }
  return out;
}

function bestCell(
  board: Cell[][],
  cells: { row: number; col: number }[],
  mover: Player,
): { row: number; col: number } {
  const opponent = otherPlayer(mover);
  let best = cells[0];
  let bestScore = -Infinity;
  for (const cell of cells) {
    const withMover = board.map((r) => [...r]);
    withMover[cell.row][cell.col] = mover;
    const off = cellScore(withMover, cell.row, cell.col, mover);
    const withOpp = board.map((r) => [...r]);
    withOpp[cell.row][cell.col] = opponent;
    const def = cellScore(withOpp, cell.row, cell.col, opponent);
    const score = off + def * 0.8;
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  return best;
}

export function pickConnect6Move(state: Connect6State, player: Player): Connect6Move | null {
  if (state.turn !== player) return null;
  const cells = candidateCells(state.board);
  if (cells.length === 0) return null;

  if (state.movesPlaced === 0) {
    return { cells: [cells.length === 1 ? cells[0] : bestCell(state.board, cells, player)] };
  }

  const first = bestCell(state.board, cells, player);
  const boardAfterFirst = state.board.map((r) => [...r]);
  boardAfterFirst[first.row][first.col] = player;
  const remaining = candidateCells(boardAfterFirst).filter((c) => !(c.row === first.row && c.col === first.col));
  const pool = remaining.length > 0 ? remaining : cells.filter((c) => !(c.row === first.row && c.col === first.col));
  const second = pool.length > 0 ? bestCell(boardAfterFirst, pool, player) : first;
  return { cells: [first, second] };
}
