/**
 * Sokoban: push every box onto a target square. Walking into a box pushes it
 * one square further in the same direction, only if that square is empty
 * floor or a target (not a wall or another box).
 */
export type Cell = "#" | " ";

export interface ParsedLevel {
  grid: Cell[][];
  player: [number, number];
  boxes: Set<string>;
  targets: Set<string>;
}

function key(r: number, c: number): string {
  return `${r},${c}`;
}

export function parseLevel(rows: string[]): ParsedLevel {
  const grid: Cell[][] = [];
  let player: [number, number] = [0, 0];
  const boxes = new Set<string>();
  const targets = new Set<string>();
  rows.forEach((row, r) => {
    const gridRow: Cell[] = [];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      gridRow.push(ch === "#" ? "#" : " ");
      if (ch === "@" || ch === "+") player = [r, c];
      if (ch === "$" || ch === "*") boxes.add(key(r, c));
      if (ch === "." || ch === "*" || ch === "+") targets.add(key(r, c));
    }
    grid.push(gridRow);
  });
  return { grid, player, boxes, targets };
}

export const LEVELS: string[][] = [
  ["#####", "#@$.#", "#####"],
  ["#######", "#     #", "#.$@$.#", "#     #", "#######"],
  [
    "########",
    "#      #",
    "# $  $ #",
    "#  ##  #",
    "#. @  .#",
    "#  ##  #",
    "#      #",
    "########",
  ],
];

export interface SokobanState {
  grid: Cell[][];
  player: [number, number];
  boxes: Set<string>;
  targets: Set<string>;
  moves: number;
}

export function loadLevel(index: number): SokobanState {
  const { grid, player, boxes, targets } = parseLevel(LEVELS[index]);
  return { grid, player, boxes, targets, moves: 0 };
}

const DIRS: Record<string, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

export function move(state: SokobanState, dir: keyof typeof DIRS): SokobanState {
  const [dr, dc] = DIRS[dir];
  const [pr, pc] = state.player;
  const nr = pr + dr;
  const nc = pc + dc;
  if (state.grid[nr]?.[nc] === undefined || state.grid[nr][nc] === "#") return state;

  const nKey = key(nr, nc);
  if (state.boxes.has(nKey)) {
    const br = nr + dr;
    const bc = nc + dc;
    if (state.grid[br]?.[bc] === undefined || state.grid[br][bc] === "#") return state;
    const bKey = key(br, bc);
    if (state.boxes.has(bKey)) return state;
    const boxes = new Set(state.boxes);
    boxes.delete(nKey);
    boxes.add(bKey);
    return { ...state, player: [nr, nc], boxes, moves: state.moves + 1 };
  }
  return { ...state, player: [nr, nc], moves: state.moves + 1 };
}

export function isSolved(state: SokobanState): boolean {
  if (state.boxes.size !== state.targets.size) return false;
  for (const b of state.boxes) if (!state.targets.has(b)) return false;
  return true;
}
