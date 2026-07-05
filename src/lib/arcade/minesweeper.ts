export interface MsCell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export type MsBoard = MsCell[][];

export interface MsDifficulty {
  rows: number;
  cols: number;
  mines: number;
}

export const MS_DIFFICULTIES: Record<string, MsDifficulty> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

function emptyBoard(rows: number, cols: number): MsBoard {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
  );
}

function neighbors(rows: number, cols: number, row: number, col: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) out.push([r, c]);
    }
  }
  return out;
}

/** First-click-safe: mines are placed only after the first reveal, avoiding that cell and its neighbors. */
export function createBoard(diff: MsDifficulty, safeRow: number, safeCol: number): MsBoard {
  const { rows, cols, mines } = diff;
  const board = emptyBoard(rows, cols);
  const forbidden = new Set<string>([`${safeRow},${safeCol}`]);
  for (const [r, c] of neighbors(rows, cols, safeRow, safeCol)) forbidden.add(`${r},${c}`);

  const cells: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!forbidden.has(`${r},${c}`)) cells.push([r, c]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (let i = 0; i < Math.min(mines, cells.length); i++) {
    const [r, c] = cells[i];
    board[r][c].mine = true;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      board[r][c].adjacent = neighbors(rows, cols, r, c).filter(([nr, nc]) => board[nr][nc].mine).length;
    }
  }
  return board;
}

function cloneBoard(board: MsBoard): MsBoard {
  return board.map((row) => row.map((c) => ({ ...c })));
}

/** Flood-fill reveal from (row,col). Returns the new board and whether a mine was hit. */
export function reveal(board: MsBoard, row: number, col: number): { board: MsBoard; hitMine: boolean } {
  const rows = board.length;
  const cols = board[0].length;
  const next = cloneBoard(board);
  if (next[row][col].flagged || next[row][col].revealed) return { board: next, hitMine: false };

  const stack: [number, number][] = [[row, col]];
  let hitMine = false;
  while (stack.length) {
    const [r, c] = stack.pop()!;
    const cell = next[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.mine) {
      hitMine = true;
      continue;
    }
    if (cell.adjacent === 0) {
      for (const [nr, nc] of neighbors(rows, cols, r, c)) {
        if (!next[nr][nc].revealed && !next[nr][nc].flagged) stack.push([nr, nc]);
      }
    }
  }
  return { board: next, hitMine };
}

export function toggleFlag(board: MsBoard, row: number, col: number): MsBoard {
  const next = cloneBoard(board);
  if (next[row][col].revealed) return next;
  next[row][col].flagged = !next[row][col].flagged;
  return next;
}

export function revealAllMines(board: MsBoard): MsBoard {
  const next = cloneBoard(board);
  for (const row of next) for (const c of row) if (c.mine) c.revealed = true;
  return next;
}

export function checkWin(board: MsBoard): boolean {
  return board.every((row) => row.every((c) => c.mine || c.revealed));
}

export function countFlags(board: MsBoard): number {
  return board.reduce((s, row) => s + row.filter((c) => c.flagged).length, 0);
}
