import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** 3x3 grid of 3x3 tic-tac-toe boards. See the client-side mirror for full commentary. */
export interface UtttState {
  boards: (Player | null)[][];
  boardWinners: (Player | "draw" | null)[];
  activeBoard: number | null;
  turn: Player;
}

export interface UtttMove {
  board: number;
  cell: number;
}

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

function checkWinner(cells: (Player | null)[]): Player | null {
  for (const [a, b, c] of LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) return cells[a];
  }
  return null;
}

function cloneState(state: UtttState): UtttState {
  return {
    boards: state.boards.map((b) => [...b]),
    boardWinners: [...state.boardWinners],
    activeBoard: state.activeBoard,
    turn: state.turn,
  };
}

export const ultimateTicTacToeEngine: GameEngine<UtttMove, UtttState> = {
  kind: "ultimatetictactoe",

  initialState(): UtttState {
    return {
      boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
      boardWinners: Array(9).fill(null),
      activeBoard: null,
      turn: "a",
    };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<UtttState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const { board, cell } = move;
    if (board == null || cell == null || board < 0 || board > 8 || cell < 0 || cell > 8) return { ok: false, error: "Off the board" };
    if (state.activeBoard != null && state.activeBoard !== board) return { ok: false, error: "Must play in the active board" };
    if (state.boardWinners[board] != null) return { ok: false, error: "That board is already decided" };
    if (state.boards[board][cell] != null) return { ok: false, error: "Cell is occupied" };

    const next = cloneState(state);
    next.boards[board][cell] = player;
    const subWinner = checkWinner(next.boards[board]);
    if (subWinner) next.boardWinners[board] = subWinner;
    else if (next.boards[board].every((c) => c != null)) next.boardWinners[board] = "draw";

    next.activeBoard = next.boardWinners[cell] == null ? cell : null;
    next.turn = otherPlayer(player);
    const notation = `b${board}c${cell}`;
    return { ok: true, state: next, notation };
  },

  getResult(state): GameResult | null {
    const metaCells = state.boardWinners.map((w) => (w === "draw" ? null : w));
    const winner = checkWinner(metaCells);
    if (winner) return { over: true, winner, reason: "Won three sub-boards in a row" };
    if (state.boardWinners.every((w) => w != null)) return { over: true, winner: null, reason: "All boards decided" };
    return null;
  },

  serialize(state) {
    return state;
  },
};
