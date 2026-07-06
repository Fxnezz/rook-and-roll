import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** 4x4 grid of boxes (5x5 dots). See the client-side mirror for full commentary. */
const SIZE = 4;

export interface DotsBoxesState {
  horizontal: boolean[][];
  vertical: boolean[][];
  boxes: (Player | null)[][];
  turn: Player;
}

export interface DotsBoxesMove {
  type: "h" | "v";
  row: number;
  col: number;
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
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

export const dotsBoxesEngine: GameEngine<DotsBoxesMove, DotsBoxesState> = {
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
    if (row == null || col == null || !grid[row] || grid[row][col] === undefined) return { ok: false, error: "Off the board" };
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
};
