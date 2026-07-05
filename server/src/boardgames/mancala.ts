import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/**
 * Standard Kalah rules. See src/lib/boardgames/engines/mancala.ts (the
 * client-side mirror) for the full rule commentary.
 */
export interface MancalaState {
  board: number[]; // length 14
  turn: Player;
}

export interface MancalaMove {
  pit: number;
}

const A_PITS = [0, 1, 2, 3, 4, 5];
const B_PITS = [7, 8, 9, 10, 11, 12];
const A_STORE = 6;
const B_STORE = 13;

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}
function ownStore(p: Player): number {
  return p === "a" ? A_STORE : B_STORE;
}
function oppStore(p: Player): number {
  return p === "a" ? B_STORE : A_STORE;
}
function ownPits(p: Player): number[] {
  return p === "a" ? A_PITS : B_PITS;
}
function opposite(i: number): number {
  return 12 - i;
}

function initialBoard(): number[] {
  return [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
}

function sow(board: number[], player: Player, pit: number): { board: number[]; extraTurn: boolean } {
  const next = [...board];
  let seeds = next[pit];
  next[pit] = 0;
  let idx = pit;
  let last = pit;
  const skip = oppStore(player);
  while (seeds > 0) {
    idx = (idx + 1) % 14;
    if (idx === skip) continue;
    next[idx]++;
    seeds--;
    last = idx;
  }

  const extraTurn = last === ownStore(player);
  if (ownPits(player).includes(last) && next[last] === 1) {
    const oppPit = opposite(last);
    if (next[oppPit] > 0) {
      next[ownStore(player)] += next[oppPit] + 1;
      next[last] = 0;
      next[oppPit] = 0;
    }
  }
  return { board: next, extraTurn };
}

function sideEmpty(board: number[], pits: number[]): boolean {
  return pits.every((i) => board[i] === 0);
}

function sideTotal(board: number[], store: number, pits: number[]): number {
  return board[store] + pits.reduce((s, i) => s + board[i], 0);
}

export const mancalaEngine: GameEngine<MancalaMove, MancalaState> = {
  kind: "mancala",

  initialState(): MancalaState {
    return { board: initialBoard(), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<MancalaState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const { pit } = move;
    if (pit == null || !ownPits(player).includes(pit)) return { ok: false, error: "Not your pit" };
    if (state.board[pit] === 0) return { ok: false, error: "That pit is empty" };

    const { board, extraTurn } = sow(state.board, player, pit);
    const turn = extraTurn ? player : otherPlayer(player);
    const notation = `${player}${pit % 7}${extraTurn ? "+" : ""}`;
    return { ok: true, state: { board, turn }, notation };
  },

  getResult(state): GameResult | null {
    const aEmpty = sideEmpty(state.board, A_PITS);
    const bEmpty = sideEmpty(state.board, B_PITS);
    if (!aEmpty && !bEmpty) return null;
    const aScore = sideTotal(state.board, A_STORE, A_PITS);
    const bScore = sideTotal(state.board, B_STORE, B_PITS);
    if (aScore === bScore) return { over: true, winner: null, reason: `Board settled ${aScore}–${bScore}` };
    return { over: true, winner: aScore > bScore ? "a" : "b", reason: `${aScore}–${bScore} seeds` };
  },

  serialize(state) {
    return state;
  },
};
