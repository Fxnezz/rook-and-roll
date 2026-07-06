import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Client-side mirror of server/src/boardgames/dotsboxes.ts. 4x4 grid of boxes
 * (5x5 dots). Drawing the 4th side of a box claims it and grants an extra
 * turn (state.turn simply doesn't flip that move — same pattern as Mancala's
 * extra-turn rule, which the shared minimax already handles gracefully).
 */
const SIZE = 4;

export interface DotsBoxesState {
  horizontal: boolean[][]; // [SIZE+1][SIZE]
  vertical: boolean[][]; // [SIZE][SIZE+1]
  boxes: (Player | null)[][]; // [SIZE][SIZE]
  turn: Player;
}

export interface DotsBoxesMove {
  type: "h" | "v";
  row: number;
  col: number;
}

function emptyState(): DotsBoxesState {
  return {
    horizontal: Array.from({ length: SIZE + 1 }, () => Array(SIZE).fill(false)),
    vertical: Array.from({ length: SIZE }, () => Array(SIZE + 1).fill(false)),
    boxes: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
    turn: "a",
  };
}

function cloneState(state: DotsBoxesState): DotsBoxesState {
  return {
    horizontal: state.horizontal.map((r) => [...r]),
    vertical: state.vertical.map((r) => [...r]),
    boxes: state.boxes.map((r) => [...r]),
    turn: state.turn,
  };
}

function boxComplete(state: DotsBoxesState, row: number, col: number): boolean {
  return state.horizontal[row][col] && state.horizontal[row + 1][col] && state.vertical[row][col] && state.vertical[row][col + 1];
}

/** Draws the edge and claims any newly-completed boxes; returns how many boxes were claimed. */
function applyEdge(state: DotsBoxesState, player: Player, move: DotsBoxesMove): number {
  if (move.type === "h") state.horizontal[move.row][move.col] = true;
  else state.vertical[move.row][move.col] = true;

  let claimed = 0;
  const candidates: [number, number][] =
    move.type === "h"
      ? [[move.row - 1, move.col], [move.row, move.col]]
      : [[move.row, move.col - 1], [move.row, move.col]];
  for (const [row, col] of candidates) {
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) continue;
    if (state.boxes[row][col] !== null) continue;
    if (boxComplete(state, row, col)) {
      state.boxes[row][col] = player;
      claimed++;
    }
  }
  return claimed;
}

function countBoxes(state: DotsBoxesState): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const row of state.boxes) for (const c of row) { if (c === "a") a++; else if (c === "b") b++; }
  return { a, b };
}

function allEdgesDrawn(state: DotsBoxesState): boolean {
  return state.horizontal.every((r) => r.every(Boolean)) && state.vertical.every((r) => r.every(Boolean));
}

export const dotsBoxesEngine: BotCapableEngine<DotsBoxesMove, DotsBoxesState> = {
  kind: "dotsboxes",

  initialState(): DotsBoxesState {
    return emptyState();
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<DotsBoxesState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const { type, row, col } = move;
    const grid = type === "h" ? state.horizontal : state.vertical;
    if (!grid[row] || grid[row][col] === undefined) return { ok: false, error: "Off the board" };
    if (grid[row][col]) return { ok: false, error: "That line is already drawn" };

    const next = cloneState(state);
    const claimed = applyEdge(next, player, move);
    next.turn = claimed > 0 ? player : otherPlayer(player);
    const notation = `${type}${row},${col}${claimed > 0 ? ` (+${claimed})` : ""}`;
    return { ok: true, state: next, notation };
  },

  getResult(state): GameResult | null {
    if (!allEdgesDrawn(state)) return null;
    const { a, b } = countBoxes(state);
    if (a === b) return { over: true, winner: null, reason: `${a}–${b} boxes` };
    return { over: true, winner: a > b ? "a" : "b", reason: `${a}–${b} boxes` };
  },

  serialize(state) {
    return state;
  },

  generateMoves(state): DotsBoxesMove[] {
    const moves: DotsBoxesMove[] = [];
    for (let row = 0; row < state.horizontal.length; row++) {
      for (let col = 0; col < state.horizontal[row].length; col++) {
        if (!state.horizontal[row][col]) moves.push({ type: "h", row, col });
      }
    }
    for (let row = 0; row < state.vertical.length; row++) {
      for (let col = 0; col < state.vertical[row].length; col++) {
        if (!state.vertical[row][col]) moves.push({ type: "v", row, col });
      }
    }
    return moves;
  },

  evaluate(state, player): number {
    const opp = otherPlayer(player);
    const { a, b } = countBoxes(state);
    const boxDiff = player === "a" ? a - b : b - a;

    // Penalize boxes that are one edge away from completion (whoever moves
    // next can, and usually will, take them for free).
    let threeSided = 0;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (state.boxes[row][col] !== null) continue;
        const sides = [state.horizontal[row][col], state.horizontal[row + 1][col], state.vertical[row][col], state.vertical[row][col + 1]];
        if (sides.filter(Boolean).length === 3) threeSided++;
      }
    }
    void opp;
    return boxDiff * 10 - threeSided * 3;
  },
};
