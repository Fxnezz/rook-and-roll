// 9x9 Sudoku: generation (via a randomized backtracking fill) and solving
// (backtracking with an early exit once more than one solution is found, used
// to guarantee a puzzle has a unique solution while carving out clues).
export type SudokuGrid = number[][]; // 0 = empty

export const SUDOKU_DIFFICULTIES: Record<string, number> = {
  easy: 40,
  medium: 32,
  hard: 26,
};

function emptyGrid(): SudokuGrid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function cloneGrid(grid: SudokuGrid): SudokuGrid {
  return grid.map((row) => [...row]);
}

export function isValidPlacement(grid: SudokuGrid, row: number, col: number, val: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === val || grid[i][col] === val) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r][c] === val) return false;
    }
  }
  return true;
}

function shuffledDigits(): number[] {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

function findEmpty(grid: SudokuGrid): [number, number] | null {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (grid[r][c] === 0) return [r, c];
  return null;
}

/** Randomized backtracking fill — used to generate a fresh complete solution. */
export function generateSolved(): SudokuGrid {
  const grid = emptyGrid();
  function fill(): boolean {
    const spot = findEmpty(grid);
    if (!spot) return true;
    const [r, c] = spot;
    for (const val of shuffledDigits()) {
      if (isValidPlacement(grid, r, c, val)) {
        grid[r][c] = val;
        if (fill()) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }
  fill();
  return grid;
}

/** Deterministic backtracking solve; returns the solved grid or null if unsolvable. */
export function solve(grid: SudokuGrid): SudokuGrid | null {
  const g = cloneGrid(grid);
  function fill(): boolean {
    const spot = findEmpty(g);
    if (!spot) return true;
    const [r, c] = spot;
    for (let val = 1; val <= 9; val++) {
      if (isValidPlacement(g, r, c, val)) {
        g[r][c] = val;
        if (fill()) return true;
        g[r][c] = 0;
      }
    }
    return false;
  }
  return fill() ? g : null;
}

/** Counts solutions up to `limit` (stops early) — used to check uniqueness while carving clues. */
function countSolutions(grid: SudokuGrid, limit: number): number {
  const g = cloneGrid(grid);
  let count = 0;
  function search(): void {
    if (count >= limit) return;
    const spot = findEmpty(g);
    if (!spot) {
      count++;
      return;
    }
    const [r, c] = spot;
    for (let val = 1; val <= 9; val++) {
      if (count >= limit) return;
      if (isValidPlacement(g, r, c, val)) {
        g[r][c] = val;
        search();
        g[r][c] = 0;
      }
    }
  }
  search();
  return count;
}

/** Carves clues out of a solved grid down to `clueCount`, only removing a cell when the puzzle still has exactly one solution. */
export function generatePuzzle(clueCount: number): { puzzle: SudokuGrid; solution: SudokuGrid } {
  const solution = generateSolved();
  const puzzle = cloneGrid(solution);
  const cells = Array.from({ length: 81 }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  let remaining = 81;
  for (const idx of cells) {
    if (remaining <= clueCount) break;
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    if (puzzle[r][c] === 0) continue;
    const saved = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[r][c] = saved; // removing this cell breaks uniqueness — put it back
    } else {
      remaining--;
    }
  }
  return { puzzle, solution };
}

export function isComplete(grid: SudokuGrid): boolean {
  return grid.every((row) => row.every((v) => v !== 0));
}

export function findConflicts(grid: SudokuGrid): Set<string> {
  const conflicts = new Set<string>();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (val === 0) continue;
      for (let i = 0; i < 9; i++) {
        if (i !== c && grid[r][i] === val) { conflicts.add(`${r},${c}`); conflicts.add(`${r},${i}`); }
        if (i !== r && grid[i][c] === val) { conflicts.add(`${r},${c}`); conflicts.add(`${i},${c}`); }
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          if ((rr !== r || cc !== c) && grid[rr][cc] === val) {
            conflicts.add(`${r},${c}`);
            conflicts.add(`${rr},${cc}`);
          }
        }
      }
    }
  }
  return conflicts;
}
