/**
 * Battleship vs a bot, 8x8 boards. Classic fleet (sizes 5,4,3,3,2) placed
 * randomly for both sides. Players strictly alternate one shot each turn
 * (no bonus turn on a hit, to keep the flow simple for a casual vs-bot game).
 */
export const SIZE = 8;
export const SHIP_SIZES = [5, 4, 3, 3, 2];

export interface Ship {
  cells: number[];
  hits: boolean[];
}

export interface PlayerBoard {
  ships: Ship[];
  shots: (boolean | null)[]; // indexed by cell: null = unshot, true = hit, false = miss
}

function shipCells(row: number, col: number, size: number, horizontal: boolean): number[] | null {
  const cells: number[] = [];
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;
    cells.push(r * SIZE + c);
  }
  return cells;
}

export function placeShipsRandomly(): Ship[] {
  const occupied = Array(SIZE * SIZE).fill(false);
  const ships: Ship[] = [];
  for (const size of SHIP_SIZES) {
    let placed = false;
    for (let attempt = 0; attempt < 500 && !placed; attempt++) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * SIZE);
      const col = Math.floor(Math.random() * SIZE);
      const cells = shipCells(row, col, size, horizontal);
      if (!cells || cells.some((c) => occupied[c])) continue;
      cells.forEach((c) => (occupied[c] = true));
      ships.push({ cells, hits: Array(size).fill(false) });
      placed = true;
    }
    if (!placed) throw new Error("Failed to place ship");
  }
  return ships;
}

export function fireAt(board: PlayerBoard, cell: number): { board: PlayerBoard; hit: boolean; sunk: boolean } {
  if (board.shots[cell] != null) return { board, hit: false, sunk: false };
  const shipIdx = board.ships.findIndex((s) => s.cells.includes(cell));
  const shots = [...board.shots];
  if (shipIdx < 0) {
    shots[cell] = false;
    return { board: { ...board, shots }, hit: false, sunk: false };
  }
  shots[cell] = true;
  const ships = board.ships.map((s, i) =>
    i !== shipIdx ? s : { ...s, hits: s.hits.map((h, j) => (s.cells[j] === cell ? true : h)) },
  );
  const sunk = ships[shipIdx].hits.every(Boolean);
  return { board: { ships, shots }, hit: true, sunk };
}

export function allSunk(board: PlayerBoard): boolean {
  return board.ships.every((s) => s.hits.every(Boolean));
}

/** Simple hunt/target bot: after a hit on a not-yet-sunk ship, fire at an adjacent unshot cell; otherwise fire randomly. */
export function pickBotShot(board: PlayerBoard): number {
  const candidates: number[] = [];
  for (const ship of board.ships) {
    if (ship.hits.every(Boolean)) continue;
    for (let i = 0; i < ship.cells.length; i++) {
      if (!ship.hits[i]) continue;
      const cell = ship.cells[i];
      const row = Math.floor(cell / SIZE);
      const col = cell % SIZE;
      for (const [dr, dc] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
        const n = r * SIZE + c;
        if (board.shots[n] == null) candidates.push(n);
      }
    }
  }
  const pool = candidates.length > 0 ? candidates : board.shots.map((s, i) => (s == null ? i : -1)).filter((i) => i >= 0);
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface BattleshipState {
  player: PlayerBoard;
  bot: PlayerBoard;
  turn: "player" | "bot";
  status: "playing" | "won" | "lost";
}

export function newGame(): BattleshipState {
  return {
    player: { ships: placeShipsRandomly(), shots: Array(SIZE * SIZE).fill(null) },
    bot: { ships: placeShipsRandomly(), shots: Array(SIZE * SIZE).fill(null) },
    turn: "player",
    status: "playing",
  };
}
