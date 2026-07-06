import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Standard 24-point board. See the client-side mirror for full commentary. */
export const MILLS: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23],
];

function buildAdjacency(): number[][] {
  const adj: Set<number>[] = Array.from({ length: 24 }, () => new Set<number>());
  for (const mill of MILLS) {
    adj[mill[0]].add(mill[1]);
    adj[mill[1]].add(mill[0]);
    adj[mill[1]].add(mill[2]);
    adj[mill[2]].add(mill[1]);
  }
  return adj.map((s) => [...s]);
}
export const ADJACENCY = buildAdjacency();

const MILLS_BY_POINT: number[][][] = Array.from({ length: 24 }, (_, p) => MILLS.filter((m) => m.includes(p)));

export type Points = (Player | null)[];

export interface NineMensMorrisState {
  points: Points;
  toPlace: { a: number; b: number };
  turn: Player;
  movesSinceRemoval: number;
}

export type NineMensMorrisMove =
  | { type: "place"; point: number; remove?: number }
  | { type: "move"; from: number; to: number; remove?: number };

const START_PIECES = 9;
const DRAW_AFTER_QUIET_MOVES = 40;

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

function phaseOf(state: NineMensMorrisState): "placing" | "moving" {
  return state.toPlace.a > 0 || state.toPlace.b > 0 ? "placing" : "moving";
}

function pieceCounts(points: Points): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const p of points) { if (p === "a") a++; else if (p === "b") b++; }
  return { a, b };
}

function formsMill(points: Points, player: Player, point: number): boolean {
  return MILLS_BY_POINT[point].some((mill) => mill.every((p) => points[p] === player));
}

function allInMills(points: Points, player: Player): boolean {
  const owned = points.map((p, i) => (p === player ? i : -1)).filter((i) => i >= 0);
  return owned.every((i) => MILLS_BY_POINT[i].some((mill) => mill.every((p) => points[p] === player)));
}

function canRemove(points: Points, opponent: Player, target: number): boolean {
  if (points[target] !== opponent) return false;
  const targetInMill = MILLS_BY_POINT[target].some((mill) => mill.every((p) => points[p] === opponent));
  if (!targetInMill) return true;
  return allInMills(points, opponent);
}

function cloneState(state: NineMensMorrisState): NineMensMorrisState {
  return { points: [...state.points], toPlace: { ...state.toPlace }, turn: state.turn, movesSinceRemoval: state.movesSinceRemoval };
}

export const nineMensMorrisEngine: GameEngine<NineMensMorrisMove, NineMensMorrisState> = {
  kind: "ninemensmorris",

  initialState(): NineMensMorrisState {
    return { points: Array(24).fill(null), toPlace: { a: START_PIECES, b: START_PIECES }, turn: "a", movesSinceRemoval: 0 };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<NineMensMorrisState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const phase = phaseOf(state);
    const next = cloneState(state);
    let landedPoint: number;

    if (phase === "placing") {
      if (move.type !== "place") return { ok: false, error: "You must place a piece" };
      if (next.points[move.point] !== null) return { ok: false, error: "Point is occupied" };
      next.points[move.point] = player;
      next.toPlace[player] -= 1;
      landedPoint = move.point;
    } else {
      if (move.type !== "move") return { ok: false, error: "You must move a piece" };
      if (next.points[move.from] !== player) return { ok: false, error: "No piece there" };
      if (next.points[move.to] !== null) return { ok: false, error: "Destination occupied" };
      const flying = pieceCounts(next.points)[player] === 3;
      if (!flying && !ADJACENCY[move.from].includes(move.to)) return { ok: false, error: "Not adjacent" };
      next.points[move.from] = null;
      next.points[move.to] = player;
      landedPoint = move.to;
    }

    const opponent = otherPlayer(player);
    const madeMill = formsMill(next.points, player, landedPoint);
    if (madeMill) {
      if (move.remove == null) return { ok: false, error: "Choose an opponent piece to remove" };
      if (!canRemove(next.points, opponent, move.remove)) return { ok: false, error: "Can't remove that piece" };
      next.points[move.remove] = null;
      next.movesSinceRemoval = 0;
    } else {
      if (move.remove != null) return { ok: false, error: "No mill formed — nothing to remove" };
      next.movesSinceRemoval += 1;
    }

    next.turn = opponent;
    const notation =
      move.type === "place"
        ? `place ${move.point}${madeMill ? ` x${move.remove}` : ""}`
        : `${move.from}-${move.to}${madeMill ? ` x${move.remove}` : ""}`;
    return { ok: true, state: next, notation };
  },

  getResult(state): GameResult | null {
    const counts = pieceCounts(state.points);
    const phase = phaseOf(state);
    if (phase === "moving") {
      if (counts.a < 3) return { over: true, winner: "b", reason: "Reduced to fewer than 3 pieces" };
      if (counts.b < 3) return { over: true, winner: "a", reason: "Reduced to fewer than 3 pieces" };
      const mover = state.turn;
      const flying = counts[mover] === 3;
      const hasMove = state.points.some((p, from) => {
        if (p !== mover) return false;
        if (flying) return state.points.some((q) => q === null);
        return ADJACENCY[from].some((to) => state.points[to] === null);
      });
      if (!hasMove) return { over: true, winner: otherPlayer(mover), reason: "No legal moves" };
      if (state.movesSinceRemoval >= DRAW_AFTER_QUIET_MOVES) {
        return { over: true, winner: null, reason: `${DRAW_AFTER_QUIET_MOVES} moves without a mill` };
      }
    }
    return null;
  },

  serialize(state) {
    return state;
  },
};
