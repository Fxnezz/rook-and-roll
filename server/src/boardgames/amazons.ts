import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** Server mirror of src/lib/boardgames/engines/amazons.ts — see there for full commentary. */
export const SIZE = 6;

export type Cell = Player | "burned" | null;

export interface AmazonsState {
  board: Cell[];
  turn: Player;
}

export interface AmazonsMove {
  from: number;
  to: number;
  shoot: number;
}

function idx(r: number, c: number): number {
  return r * SIZE + c;
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

const DIRS8: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function queenDestinations(board: Cell[], from: number): number[] {
  const r = Math.floor(from / SIZE);
  const c = from % SIZE;
  const out: number[] = [];
  for (const [dr, dc] of DIRS8) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && board[idx(nr, nc)] == null) {
      out.push(idx(nr, nc));
      nr += dr;
      nc += dc;
    }
  }
  return out;
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

function initialBoard(): Cell[] {
  const board: Cell[] = Array(SIZE * SIZE).fill(null);
  board[idx(0, 1)] = "a";
  board[idx(0, 4)] = "a";
  board[idx(SIZE - 1, 1)] = "b";
  board[idx(SIZE - 1, 4)] = "b";
  return board;
}

export const amazonsEngine: GameEngine<AmazonsMove, AmazonsState> = {
  kind: "amazons",

  initialState(): AmazonsState {
    return { board: initialBoard(), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<AmazonsState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    if (state.board[move.from] !== player) return { ok: false, error: "No amazon there" };
    if (!queenDestinations(state.board, move.from).includes(move.to)) return { ok: false, error: "Illegal move" };

    const afterMove = [...state.board];
    afterMove[move.to] = player;
    afterMove[move.from] = null;
    if (!queenDestinations(afterMove, move.to).includes(move.shoot)) return { ok: false, error: "Illegal shot" };

    afterMove[move.shoot] = "burned";
    return {
      ok: true,
      state: { board: afterMove, turn: otherPlayer(player) },
      notation: `${move.from}->${move.to} shoot ${move.shoot}`,
    };
  },

  getResult(state): GameResult | null {
    const mover = state.turn;
    const hasMove = state.board.some((c, i) => c === mover && queenDestinations(state.board, i).length > 0);
    if (!hasMove) return { over: true, winner: otherPlayer(mover), reason: "No legal moves" };
    return null;
  },

  serialize(state) {
    return state;
  },
};
