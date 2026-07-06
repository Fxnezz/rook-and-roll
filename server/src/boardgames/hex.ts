import type { GameEngine, GameResult, MoveResult, Player } from "./engine.js";

/** 7x7 Hex. See the client-side mirror for full commentary. */
const SIZE = 7;
const NEIGHBOR_OFFSETS: [number, number][] = [
  [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0],
];

export interface HexState {
  board: (Player | null)[][];
  turn: Player;
}

export interface HexMove {
  row: number;
  col: number;
}

function otherPlayer(p: Player): Player {
  return p === "a" ? "b" : "a";
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function neighbors(row: number, col: number): [number, number][] {
  return NEIGHBOR_OFFSETS.map(([dr, dc]) => [row + dr, col + dc] as [number, number]).filter(([r, c]) => inBounds(r, c));
}

function cloneBoard(board: (Player | null)[][]): (Player | null)[][] {
  return board.map((r) => [...r]);
}

function isConnected(board: (Player | null)[][], player: Player): boolean {
  const visited = new Set<string>();
  const queue: [number, number][] = [];
  if (player === "a") {
    for (let c = 0; c < SIZE; c++) if (board[0][c] === "a") { queue.push([0, c]); visited.add(`0,${c}`); }
  } else {
    for (let r = 0; r < SIZE; r++) if (board[r][0] === "b") { queue.push([r, 0]); visited.add(`${r},0`); }
  }
  while (queue.length) {
    const [row, col] = queue.shift()!;
    if (player === "a" && row === SIZE - 1) return true;
    if (player === "b" && col === SIZE - 1) return true;
    for (const [nr, nc] of neighbors(row, col)) {
      const key = `${nr},${nc}`;
      if (visited.has(key) || board[nr][nc] !== player) continue;
      visited.add(key);
      queue.push([nr, nc]);
    }
  }
  return false;
}

export const hexEngine: GameEngine<HexMove, HexState> = {
  kind: "hex",

  initialState(): HexState {
    return { board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)), turn: "a" };
  },

  turnOf(state) {
    return state.turn;
  },

  applyMove(state, player, move): MoveResult<HexState> {
    if (state.turn !== player) return { ok: false, error: "Not your turn" };
    const { row, col } = move;
    if (row == null || col == null || !inBounds(row, col)) return { ok: false, error: "Off the board" };
    if (state.board[row][col] !== null) return { ok: false, error: "Cell is occupied" };

    const board = cloneBoard(state.board);
    board[row][col] = player;
    const notation = `${String.fromCharCode(97 + col)}${row + 1}`;
    return { ok: true, state: { board, turn: otherPlayer(player) }, notation };
  },

  getResult(state): GameResult | null {
    if (isConnected(state.board, "a")) return { over: true, winner: "a", reason: "Connected top to bottom" };
    if (isConnected(state.board, "b")) return { over: true, winner: "b", reason: "Connected left to right" };
    return null;
  },

  serialize(state) {
    return state;
  },
};
