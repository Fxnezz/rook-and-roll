import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/sim.ts — see there for full commentary. */
export const VERTEX_COUNT = 6;

export const EDGES: [number, number][] = [];
for (let i = 0; i < VERTEX_COUNT; i++) {
  for (let j = i + 1; j < VERTEX_COUNT; j++) EDGES.push([i, j]);
}

function edgeIndex(a: number, b: number): number {
  const [i, j] = a < b ? [a, b] : [b, a];
  return EDGES.findIndex(([x, y]) => x === i && y === j);
}

const TRIANGLES: [number, number, number][] = [];
for (let a = 0; a < VERTEX_COUNT; a++) {
  for (let b = a + 1; b < VERTEX_COUNT; b++) {
    for (let c = b + 1; c < VERTEX_COUNT; c++) {
      TRIANGLES.push([edgeIndex(a, b), edgeIndex(b, c), edgeIndex(a, c)]);
    }
  }
}

export interface SimState {
  edges: (Player | null)[];
  turn: Player;
}

export interface SimMove {
  edge: number;
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

export const simEngine: GameEngine<SimMove, SimState> = {
  kind: "sim",

  initialState(): SimState {
    return { edges: Array(EDGES.length).fill(null), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<SimState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (move.edge < 0 || move.edge >= EDGES.length || state.edges[move.edge] != null) {
      return { ok: false, error: "Edge already colored" };
    }
    const edges = [...state.edges];
    edges[move.edge] = player;
    const notation = `edge ${EDGES[move.edge].join("-")}`;
    return { ok: true, state: { edges, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    for (const tri of TRIANGLES) {
      const colors = tri.map((e) => state.edges[e]);
      if (colors[0] != null && colors[0] === colors[1] && colors[1] === colors[2]) {
        return {
          over: true,
          winner: otherPlayer(colors[0]),
          reason: `${colors[0] === "a" ? "Player 1" : "Player 2"} completed a monochromatic triangle`,
        };
      }
    }
    if (state.edges.every((e) => e != null)) return { over: true, winner: null, reason: "All edges colored" };
    return null;
  },

  serialize(state) {
    return state;
  },
};
