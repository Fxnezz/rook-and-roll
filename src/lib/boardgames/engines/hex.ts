import type { BotCapableEngine, GameResult, MoveResult, Player } from "./types";
import { otherPlayer } from "./types";

/**
 * Client-side mirror of server/src/boardgames/hex.ts. 7x7 Hex board. Player
 * "a" connects the top edge to the bottom edge; "b" connects left to right.
 * Hex is drawless: on a full board exactly one side always has a connecting
 * chain (a real theorem, not a rule of thumb), so there's no draw case.
 */
const SIZE = 7;

// Standard hex-grid neighbor offsets for a row-offset rhombus board.
const NEIGHBOR_OFFSETS: [number, number][] = [
  [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0],
];

export interface HexState {
  board: (Player | null)[][]; // [row][col], SIZE x SIZE
  turn: Player;
}

export interface HexMove {
  row: number;
  col: number;
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

/** BFS connectivity check: does `player` have a chain across their two edges? */
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

/** 0-1 BFS: minimum stones still needed for `player` to connect their two edges. */
function shortestConnectionCost(board: (Player | null)[][], player: Player): number {
  const dist = new Map<string, number>();
  const deque: [number, number][] = [];
  const cost = (row: number, col: number) => (board[row][col] === player ? 0 : board[row][col] === null ? 1 : Infinity);

  const starts: [number, number][] = player === "a" ? Array.from({ length: SIZE }, (_, c) => [0, c] as [number, number]) : Array.from({ length: SIZE }, (_, r) => [r, 0] as [number, number]);
  for (const [r, c] of starts) {
    const c0 = cost(r, c);
    if (c0 === Infinity) continue;
    const key = `${r},${c}`;
    if (!dist.has(key) || dist.get(key)! > c0) {
      dist.set(key, c0);
      if (c0 === 0) deque.unshift([r, c]);
      else deque.push([r, c]);
    }
  }

  let best = Infinity;
  while (deque.length) {
    const [row, col] = deque.shift()!;
    const d = dist.get(`${row},${col}`)!;
    const reachedEnd = player === "a" ? row === SIZE - 1 : col === SIZE - 1;
    if (reachedEnd) best = Math.min(best, d);
    for (const [nr, nc] of neighbors(row, col)) {
      const stepCost = cost(nr, nc);
      if (stepCost === Infinity) continue;
      const nd = d + stepCost;
      const key = `${nr},${nc}`;
      if (!dist.has(key) || dist.get(key)! > nd) {
        dist.set(key, nd);
        if (stepCost === 0) deque.unshift([nr, nc]);
        else deque.push([nr, nc]);
      }
    }
  }
  return best;
}

export const hexEngine: BotCapableEngine<HexMove, HexState> = {
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
    if (!inBounds(row, col)) return { ok: false, error: "Off the board" };
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

  generateMoves(state): HexMove[] {
    const moves: HexMove[] = [];
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) if (state.board[row][col] === null) moves.push({ row, col });
    return moves;
  },

  evaluate(state, player): number {
    const opp = otherPlayer(player);
    const myCost = shortestConnectionCost(state.board, player);
    const oppCost = shortestConnectionCost(state.board, opp);
    if (myCost === 0) return 100_000;
    if (oppCost === 0) return -100_000;
    return oppCost - myCost;
  },
};
