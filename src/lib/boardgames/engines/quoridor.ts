import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Quoridor on a 7x7 board (scaled down from the standard 9x9 for a snappier
 * bot search), 5 walls per player. Player "a" starts at the top and races to
 * the bottom row; player "b" starts at the bottom and races to the top.
 * Each turn either move one step (or jump the opponent, including diagonal
 * jumps when the straight jump is blocked) or place a 2-cell wall — as long
 * as it doesn't seal off either player's path to their goal entirely.
 */
export const SIZE = 7;
export const WALLS_PER_PLAYER = 5;

export interface QuoridorState {
  positions: Record<Player, number>;
  wallsLeft: Record<Player, number>;
  hWalls: string[]; // "wr,wc" keys, wall spans columns wc,wc+1 between rows wr,wr+1
  vWalls: string[]; // "wr,wc" keys, wall spans rows wr,wr+1 between columns wc,wc+1
  turn: Player;
}

export type QuoridorMove = { type: "move"; to: number } | { type: "wall"; orientation: "h" | "v"; wr: number; wc: number };

function rc(cell: number): [number, number] {
  return [Math.floor(cell / SIZE), cell % SIZE];
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function edgeBlocked(hWalls: Set<string>, vWalls: Set<string>, r1: number, c1: number, r2: number, c2: number): boolean {
  if (r1 === r2) {
    const col = Math.min(c1, c2);
    const row = r1;
    return vWalls.has(`${row - 1},${col}`) || vWalls.has(`${row},${col}`);
  }
  const row = Math.min(r1, r2);
  const col = c1;
  return hWalls.has(`${row},${col - 1}`) || hWalls.has(`${row},${col}`);
}

const DIRS4: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function legalPawnMoves(state: QuoridorState, player: Player): number[] {
  const hSet = new Set(state.hWalls);
  const vSet = new Set(state.vWalls);
  const pos = state.positions[player];
  const opp = state.positions[otherPlayer(player)];
  const [r, c] = rc(pos);
  const moves: number[] = [];
  for (const [dr, dc] of DIRS4) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc) || edgeBlocked(hSet, vSet, r, c, nr, nc)) continue;
    const target = nr * SIZE + nc;
    if (target === opp) {
      const jr = nr + dr;
      const jc = nc + dc;
      if (inBounds(jr, jc) && !edgeBlocked(hSet, vSet, nr, nc, jr, jc)) {
        moves.push(jr * SIZE + jc);
      } else {
        const perp: [number, number][] = dr !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
        for (const [ddr, ddc] of perp) {
          const sr = nr + ddr;
          const sc = nc + ddc;
          if (inBounds(sr, sc) && !edgeBlocked(hSet, vSet, nr, nc, sr, sc)) moves.push(sr * SIZE + sc);
        }
      }
      continue;
    }
    moves.push(target);
  }
  return moves;
}

/** BFS shortest path length from `player`'s pawn to their goal row. */
function pathLength(hWalls: Set<string>, vWalls: Set<string>, from: number, goalRow: number): number {
  const visited = new Array(SIZE * SIZE).fill(false);
  visited[from] = true;
  let frontier = [from];
  let dist = 0;
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const cell of frontier) {
      const [r, c] = rc(cell);
      if (r === goalRow) return dist;
      for (const [dr, dc] of DIRS4) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc) || edgeBlocked(hWalls, vWalls, r, c, nr, nc)) continue;
        const ni = nr * SIZE + nc;
        if (visited[ni]) continue;
        visited[ni] = true;
        next.push(ni);
      }
    }
    frontier = next;
    dist++;
  }
  return Infinity;
}

function goalRowFor(player: Player): number {
  return player === "a" ? SIZE - 1 : 0;
}

function wallConflicts(state: QuoridorState, orientation: "h" | "v", wr: number, wc: number): boolean {
  if (wr < 0 || wr >= SIZE - 1 || wc < 0 || wc >= SIZE - 1) return true;
  const hSet = new Set(state.hWalls);
  const vSet = new Set(state.vWalls);
  if (orientation === "h") {
    if (hSet.has(`${wr},${wc - 1}`) || hSet.has(`${wr},${wc}`) || hSet.has(`${wr},${wc + 1}`)) return true;
    if (vSet.has(`${wr},${wc}`)) return true;
  } else {
    if (vSet.has(`${wr - 1},${wc}`) || vSet.has(`${wr},${wc}`) || vSet.has(`${wr + 1},${wc}`)) return true;
    if (hSet.has(`${wr},${wc}`)) return true;
  }
  return false;
}

function legalWallMoves(state: QuoridorState, player: Player): QuoridorMove[] {
  if (state.wallsLeft[player] <= 0) return [];
  const moves: QuoridorMove[] = [];
  for (let wr = 0; wr < SIZE - 1; wr++) {
    for (let wc = 0; wc < SIZE - 1; wc++) {
      for (const orientation of ["h", "v"] as const) {
        if (wallConflicts(state, orientation, wr, wc)) continue;
        const hSet = new Set(state.hWalls);
        const vSet = new Set(state.vWalls);
        if (orientation === "h") hSet.add(`${wr},${wc}`);
        else vSet.add(`${wr},${wc}`);
        const aOk = pathLength(hSet, vSet, state.positions.a, goalRowFor("a")) < Infinity;
        const bOk = pathLength(hSet, vSet, state.positions.b, goalRowFor("b")) < Infinity;
        if (aOk && bOk) moves.push({ type: "wall", orientation, wr, wc });
      }
    }
  }
  return moves;
}

export const quoridorEngine: BotCapableEngine<QuoridorMove, QuoridorState> = {
  kind: "quoridor",

  initialState(): QuoridorState {
    const mid = Math.floor(SIZE / 2);
    return {
      positions: { a: mid, b: (SIZE - 1) * SIZE + mid },
      wallsLeft: { a: WALLS_PER_PLAYER, b: WALLS_PER_PLAYER },
      hWalls: [],
      vWalls: [],
      turn: "a",
    };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<QuoridorState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };

    if (move.type === "move") {
      if (!legalPawnMoves(state, player).includes(move.to)) return { ok: false, error: "Illegal move" };
      const positions = { ...state.positions, [player]: move.to };
      return { ok: true, state: { ...state, positions, turn: otherPlayer(player) }, notation: `move ${move.to}` };
    }

    if (state.wallsLeft[player] <= 0) return { ok: false, error: "No walls left" };
    if (wallConflicts(state, move.orientation, move.wr, move.wc)) return { ok: false, error: "Wall conflicts" };
    const hWalls = move.orientation === "h" ? [...state.hWalls, `${move.wr},${move.wc}`] : state.hWalls;
    const vWalls = move.orientation === "v" ? [...state.vWalls, `${move.wr},${move.wc}`] : state.vWalls;
    const hSet = new Set(hWalls);
    const vSet = new Set(vWalls);
    if (pathLength(hSet, vSet, state.positions.a, goalRowFor("a")) === Infinity) return { ok: false, error: "Would block a's path" };
    if (pathLength(hSet, vSet, state.positions.b, goalRowFor("b")) === Infinity) return { ok: false, error: "Would block b's path" };
    const wallsLeft = { ...state.wallsLeft, [player]: state.wallsLeft[player] - 1 };
    return {
      ok: true,
      state: { ...state, hWalls, vWalls, wallsLeft, turn: otherPlayer(player) },
      notation: `wall ${move.orientation}${move.wr},${move.wc}`,
    };
  },

  getResult(state): GameResult | null {
    const [ar] = rc(state.positions.a);
    if (ar === goalRowFor("a")) return { over: true, winner: "a", reason: "Reached the far row" };
    const [br] = rc(state.positions.b);
    if (br === goalRowFor("b")) return { over: true, winner: "b", reason: "Reached the far row" };
    return null;
  },

  serialize(state) {
    return state;
  },

  generateMoves(state, player): QuoridorMove[] {
    if (state.turn !== player) return [];
    const moves: QuoridorMove[] = legalPawnMoves(state, player).map((to) => ({ type: "move", to }));
    return [...moves, ...legalWallMoves(state, player)];
  },

  evaluate(state, player): number {
    const hSet = new Set(state.hWalls);
    const vSet = new Set(state.vWalls);
    const opponent = otherPlayer(player);
    const mine = pathLength(hSet, vSet, state.positions[player], goalRowFor(player));
    const theirs = pathLength(hSet, vSet, state.positions[opponent], goalRowFor(opponent));
    return theirs - mine;
  },
};
