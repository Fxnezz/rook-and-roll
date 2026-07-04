import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";

export interface TicTacToeState {
  board: (Player | null)[];
  turn: Player;
}

export interface TicTacToeMove {
  index: number;
}

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const ticTacToeEngine: BotCapableEngine<TicTacToeMove, TicTacToeState> = {
  kind: "tictactoe",

  initialState(): TicTacToeState {
    return { board: Array(9).fill(null), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<TicTacToeState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (move.index < 0 || move.index > 8) return { ok: false, error: "Bad square" };
    if (state.board[move.index] !== null) return { ok: false, error: "Square taken" };
    const board = [...state.board];
    board[move.index] = player;
    return { ok: true, state: { board, turn: player === "a" ? "b" : "a" }, notation: String(move.index) };
  },

  getResult(state): GameResult | null {
    for (const [x, y, z] of LINES) {
      const v = state.board[x];
      if (v && v === state.board[y] && v === state.board[z]) return { over: true, winner: v, reason: "Three in a row" };
    }
    if (state.board.every((c) => c !== null)) return { over: true, winner: null, reason: "Draw" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state): TicTacToeMove[] {
    return state.board.flatMap((c, i) => (c === null ? [{ index: i }] : []));
  },

  evaluate(state, player): number {
    // Center/corner/edge weighting — only used as a tiebreak since the search
    // depth for tic-tac-toe always reaches a terminal state.
    const WEIGHTS = [3, 2, 3, 2, 4, 2, 3, 2, 3];
    let score = 0;
    state.board.forEach((c, i) => {
      if (c === player) score += WEIGHTS[i];
      else if (c) score -= WEIGHTS[i];
    });
    return score;
  },
};
