import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** 6x6 board, four rotating 3x3 quadrants. See the client-side mirror for full commentary. */
const SIZE = 6;

export interface PentagoState {
  board: (Player | null)[][];
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

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

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

export const pentagoEngine: GameEngine<PentagoMove, PentagoState> = {
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
    if (row == null || col == null || row < 0 || row >= SIZE || col < 0 || col >= SIZE) return { ok: false, error: "Off the board" };
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
};
