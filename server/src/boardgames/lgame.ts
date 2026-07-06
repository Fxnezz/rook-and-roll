import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/lgame.ts — see there for full commentary. */
export const SIZE = 4;

function idx(row: number, col: number): number {
  return row * SIZE + col;
}

const BASE_SHAPE: [number, number][] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
];

function rotate90(cells: [number, number][]): [number, number][] {
  return cells.map(([r, c]) => [c, -r]);
}
function reflect(cells: [number, number][]): [number, number][] {
  return cells.map(([r, c]) => [r, -c]);
}
function normalize(cells: [number, number][]): [number, number][] {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]) => [r - minR, c - minC] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function allShapes(): [number, number][][] {
  const seen = new Map<string, [number, number][]>();
  for (const base of [BASE_SHAPE, reflect(BASE_SHAPE)]) {
    let cur = base;
    for (let i = 0; i < 4; i++) {
      const norm = normalize(cur);
      seen.set(JSON.stringify(norm), norm);
      cur = rotate90(cur);
    }
  }
  return [...seen.values()];
}

const L_SHAPES = allShapes();

export interface LGameState {
  lCells: Record<Player, number[]>;
  neutral: [number, number];
  turn: Player;
}

export interface LGameMove {
  lCells: number[];
  neutralMove?: { which: 0 | 1; to: number };
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function possibleLPlacements(state: LGameState, player: Player): number[][] {
  const opponent = otherPlayer(player);
  const blocked = new Set([...state.lCells[opponent], ...state.neutral]);
  const currentKey = [...state.lCells[player]].sort((a, b) => a - b).join(",");
  const out: number[][] = [];
  const seen = new Set<string>();
  for (const shape of L_SHAPES) {
    for (let anchorR = 0; anchorR < SIZE; anchorR++) {
      for (let anchorC = 0; anchorC < SIZE; anchorC++) {
        const cells: number[] = [];
        let ok = true;
        for (const [dr, dc] of shape) {
          const r = anchorR + dr;
          const c = anchorC + dc;
          if (!inBounds(r, c)) {
            ok = false;
            break;
          }
          cells.push(idx(r, c));
        }
        if (!ok) continue;
        if (cells.some((c) => blocked.has(c))) continue;
        const key = [...cells].sort((a, b) => a - b).join(",");
        if (key === currentKey || seen.has(key)) continue;
        seen.add(key);
        out.push(cells);
      }
    }
  }
  return out;
}

export const lGameEngine: GameEngine<LGameMove, LGameState> = {
  kind: "lgame",

  initialState(): LGameState {
    return {
      lCells: {
        a: [idx(0, 1), idx(1, 1), idx(2, 1), idx(2, 0)],
        b: [idx(3, 2), idx(2, 2), idx(1, 2), idx(1, 3)],
      },
      neutral: [idx(0, 0), idx(3, 3)],
      turn: "a",
    };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<LGameState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const valid = possibleLPlacements(state, player);
    const key = [...move.lCells].sort((a, b) => a - b).join(",");
    if (!valid.some((v) => [...v].sort((a, b) => a - b).join(",") === key)) {
      return { ok: false, error: "Illegal L placement" };
    }

    const lCells = { ...state.lCells, [player]: move.lCells };
    let neutral: [number, number] = [...state.neutral];

    if (move.neutralMove) {
      const { which, to } = move.neutralMove;
      const occupied = new Set([...lCells.a, ...lCells.b, neutral[which === 0 ? 1 : 0]]);
      if (occupied.has(to)) return { ok: false, error: "Neutral target occupied" };
      neutral = which === 0 ? [to, neutral[1]] : [neutral[0], to];
    }

    return {
      ok: true,
      state: { lCells, neutral, turn: otherPlayer(player) },
      notation: `L->${move.lCells.join(",")}${move.neutralMove ? ` N${move.neutralMove.which}->${move.neutralMove.to}` : ""}`,
    };
  },

  getResult(state): GameResult | null {
    const mover = state.turn;
    if (possibleLPlacements(state, mover).length === 0) {
      return { over: true, winner: otherPlayer(mover), reason: "No legal L-piece placement" };
    }
    return null;
  },

  serialize(state) {
    return state;
  },
};
