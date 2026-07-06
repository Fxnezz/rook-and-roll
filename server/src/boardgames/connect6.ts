import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/connect6.ts — see there for full commentary. */
export type Cell = Player | null;

export interface Connect6State {
  board: Cell[][];
  turn: Player;
  movesPlaced: number;
}

export interface Connect6Move {
  cells: { row: number; col: number }[];
}

export const SIZE = 15;
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
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
function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => [...row]);
}

function checkWinner(board: Cell[][]): Player | null {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        let count = 1;
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c) && board[r][c] === p) {
          count++;
          r += dr;
          c += dc;
        }
        if (count >= 6) return p;
      }
    }
  }
  return null;
}

export const connect6Engine: GameEngine<Connect6Move, Connect6State> = {
  kind: "connect6",

  initialState(): Connect6State {
    return { board: emptyBoard(), turn: "a", movesPlaced: 0 };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<Connect6State> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const expected = state.movesPlaced === 0 ? 1 : 2;
    if (move.cells.length !== expected) return { ok: false, error: `Place exactly ${expected} stone(s)` };

    const seen = new Set<string>();
    for (const { row, col } of move.cells) {
      if (!inBounds(row, col)) return { ok: false, error: "Off the board" };
      if (state.board[row][col] !== null) return { ok: false, error: "That square is occupied" };
      const key = `${row},${col}`;
      if (seen.has(key)) return { ok: false, error: "Duplicate cell in the same move" };
      seen.add(key);
    }

    const board = cloneBoard(state.board);
    for (const { row, col } of move.cells) board[row][col] = player;
    const notation = move.cells.map(({ row, col }) => `${String.fromCharCode(97 + col)}${row + 1}`).join(",");
    return {
      ok: true,
      state: { board, turn: otherPlayer(player), movesPlaced: state.movesPlaced + move.cells.length },
      notation,
    };
  },

  getResult(state): GameResult | null {
    const winner = checkWinner(state.board);
    if (winner) return { over: true, winner, reason: "Six in a row" };
    if (state.board.every((row) => row.every((c) => c !== null))) return { over: true, winner: null, reason: "Board full" };
    return null;
  },

  serialize(state) {
    return state;
  },
};
