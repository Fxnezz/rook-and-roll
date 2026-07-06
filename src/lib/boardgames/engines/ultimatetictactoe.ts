import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Client-side mirror of server/src/boardgames/ultimatetictactoe.ts. A 3x3
 * grid of 3x3 tic-tac-toe boards. The cell you play (0-8, reading order)
 * sends your opponent to the sub-board at that same index — unless that
 * board is already decided (won or drawn), in which case they may play
 * anywhere still open. Win 3 sub-boards in a row to win the game.
 */
export interface UtttState {
  boards: (Player | null)[][]; // 9 boards x 9 cells
  boardWinners: (Player | "draw" | null)[]; // 9
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

export const ultimateTicTacToeEngine: BotCapableEngine<UtttMove, UtttState> = {
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
    if (board < 0 || board > 8 || cell < 0 || cell > 8) return { ok: false, error: "Off the board" };
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

  generateMoves(state, player): UtttMove[] {
    if (state.turn !== player) return [];
    const boardsToCheck = state.activeBoard != null ? [state.activeBoard] : Array.from({ length: 9 }, (_, i) => i);
    const moves: UtttMove[] = [];
    for (const board of boardsToCheck) {
      if (state.boardWinners[board] != null) continue;
      for (let cell = 0; cell < 9; cell++) {
        if (state.boards[board][cell] == null) moves.push({ board, cell });
      }
    }
    return moves;
  },

  evaluate(state, player): number {
    const opp = otherPlayer(player);
    let score = 0;
    for (let b = 0; b < 9; b++) {
      if (state.boardWinners[b] === player) score += b === 4 ? 30 : 20;
      else if (state.boardWinners[b] === opp) score -= b === 4 ? 30 : 20;
      else if (state.boardWinners[b] == null) {
        // Center cell of an undecided sub-board is the strongest square in it.
        if (state.boards[b][4] === player) score += 3;
        else if (state.boards[b][4] === opp) score -= 3;
      }
    }
    const metaCells = state.boardWinners.map((w) => (w === "draw" ? null : w));
    for (const [a, b, c] of LINES) {
      const line = [metaCells[a], metaCells[b], metaCells[c]];
      const mine = line.filter((v) => v === player).length;
      const theirs = line.filter((v) => v === opp).length;
      if (theirs === 0 && mine === 2) score += 15;
      if (mine === 0 && theirs === 2) score -= 15;
    }
    return score;
  },
};
