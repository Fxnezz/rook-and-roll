import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Client-side mirror of server/src/boardgames/pentago.ts. 6x6 board split
 * into four 3x3 quadrants. Every move is place-then-rotate: place a marble
 * on an empty cell, then rotate one quadrant 90°. The rotation can complete
 * a line for EITHER player (it moves the opponent's marbles too), including
 * — rarely — both at once, which is a draw; getResult always checks both
 * sides rather than assuming only the mover could have just won.
 */
const SIZE = 6;

export interface PentagoState {
  board: (Player | null)[][]; // [row][col], 6x6
  turn: Player;
}

export type Direction = "cw" | "ccw";

export interface PentagoMove {
  row: number;
  col: number;
  quadrant: 0 | 1 | 2 | 3;
  direction: Direction;
}

const QUADRANT_ORIGIN: [number, number][] = [
  [0, 0], [0, 3], [3, 0], [3, 3],
];

function cloneBoard(board: (Player | null)[][]): (Player | null)[][] {
  return board.map((r) => [...r]);
}

function rotateQuadrant(board: (Player | null)[][], quadrant: 0 | 1 | 2 | 3, dir: Direction): void {
  const [or_, oc] = QUADRANT_ORIGIN[quadrant];
  const sub: (Player | null)[][] = [];
  for (let i = 0; i < 3; i++) sub.push([board[or_ + i][oc], board[or_ + i][oc + 1], board[or_ + i][oc + 2]]);

  const rotated: (Player | null)[][] = [[null, null, null], [null, null, null], [null, null, null]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      rotated[i][j] = dir === "cw" ? sub[2 - j][i] : sub[j][2 - i];
    }
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      board[or_ + i][oc + j] = rotated[i][j];
    }
  }
}

function hasFiveInARow(board: (Player | null)[][], player: Player): boolean {
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== player) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
          count++;
          r += dr;
          c += dc;
        }
        if (count >= 5) return true;
      }
    }
  }
  return false;
}

function boardFull(board: (Player | null)[][]): boolean {
  return board.every((r) => r.every((c) => c !== null));
}

export const pentagoEngine: BotCapableEngine<PentagoMove, PentagoState> = {
  kind: "pentago",

  initialState(): PentagoState {
    return { board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<PentagoState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const { row, col, quadrant, direction } = move;
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return { ok: false, error: "Off the board" };
    if (state.board[row][col] !== null) return { ok: false, error: "Cell is occupied" };

    const board = cloneBoard(state.board);
    board[row][col] = player;
    rotateQuadrant(board, quadrant, direction);
    const notation = `${row},${col} q${quadrant}${direction}`;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    const aWins = hasFiveInARow(state.board, "a");
    const bWins = hasFiveInARow(state.board, "b");
    if (aWins && bWins) return { over: true, winner: null, reason: "Both connected five simultaneously" };
    if (aWins) return { over: true, winner: "a", reason: "Five in a row" };
    if (bWins) return { over: true, winner: "b", reason: "Five in a row" };
    if (boardFull(state.board)) return { over: true, winner: null, reason: "Board full" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state): PentagoMove[] {
    const moves: PentagoMove[] = [];
    const quadrants: (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];
    const dirs: Direction[] = ["cw", "ccw"];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (state.board[row][col] !== null) continue;
        for (const quadrant of quadrants) {
          for (const direction of dirs) moves.push({ row, col, quadrant, direction });
        }
      }
    }
    return moves;
  },

  evaluate(state, player): number {
    const opp = otherPlayer(player);
    let score = 0;
    const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const p = state.board[row][col];
        if (!p) continue;
        for (const [dr, dc] of dirs) {
          const pr = row - dr;
          const pc = col - dc;
          if (pr >= 0 && pr < SIZE && pc >= 0 && pc < SIZE && state.board[pr][pc] === p) continue;
          let len = 0;
          let r = row;
          let c = col;
          while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && state.board[r][c] === p) {
            len++;
            r += dr;
            c += dc;
          }
          const capped = Math.min(len, 5);
          const s = capped >= 5 ? 10_000 : capped * capped;
          score += p === player ? s : -s;
        }
      }
    }
    return score;
  },
};
