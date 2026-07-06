import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Sim: 6 vertices, the complete graph K6 (15 edges). Players alternate
 * coloring an uncolored edge with their own color. Whoever completes a
 * triangle (3 mutually connected vertices) entirely in their own color
 * LOSES — this is an avoidance game, not a race. Ramsey's theorem (R(3,3)=6)
 * guarantees a monochromatic triangle always appears before all 15 edges
 * are colored, so Sim can never end in a draw.
 */
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
  edges: (Player | null)[]; // length 15
  turn: Player;
}

export interface SimMove {
  edge: number; // 0-14
}

function wouldCompleteTriangle(edges: (Player | null)[], edgeIdx: number, color: Player): boolean {
  return TRIANGLES.some((tri) => {
    if (!tri.includes(edgeIdx)) return false;
    return tri.every((e) => (e === edgeIdx ? true : edges[e] === color));
  });
}

function safeMovesFor(edges: (Player | null)[], color: Player): number[] {
  return edges
    .map((c, i) => (c == null ? i : -1))
    .filter((i) => i >= 0)
    .filter((i) => !wouldCompleteTriangle(edges, i, color));
}

export const simEngine: BotCapableEngine<SimMove, SimState> = {
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

  generateMoves(state, player): SimMove[] {
    if (state.turn !== player) return [];
    return state.edges.map((c, i) => (c == null ? i : -1)).filter((i) => i >= 0).map((edge) => ({ edge }));
  },

  evaluate(state, player): number {
    return safeMovesFor(state.edges, player).length - safeMovesFor(state.edges, otherPlayer(player)).length;
  },
};
