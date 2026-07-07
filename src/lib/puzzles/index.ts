import bankJson from "./bank.json";
import type { PuzzleDef, PuzzleProgress } from "./types";
import { DEFAULT_PUZZLE_PROGRESS } from "./types";

export const PUZZLES = bankJson as PuzzleDef[];

export function getPuzzle(id: string): PuzzleDef | undefined {
  return PUZZLES.find((p) => p.id === id);
}

/** Deterministic daily puzzle: same for everyone on a given UTC date. */
export function dailyPuzzle(date = new Date()): PuzzleDef {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  let h = 2166136261;
  for (const ch of key) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return PUZZLES[(h >>> 0) % PUZZLES.length];
}

export type DifficultyFilter = "auto" | "easy" | "medium" | "hard";

const DIFFICULTY_BANDS: Record<Exclude<DifficultyFilter, "auto">, [number, number]> = {
  easy: [0, 1200],
  medium: [1200, 1800],
  hard: [1800, Infinity],
};

/**
 * Pick the next puzzle near the player's rating, preferring unsolved ones;
 * falls back to least-recently-solved when everything has been solved.
 * `difficulty` restricts the candidate pool to a fixed rating band instead
 * of the adaptive default ("auto").
 */
export function nextPuzzle(progress: PuzzleProgress, excludeId?: string, difficulty: DifficultyFilter = "auto"): PuzzleDef {
  const band = difficulty === "auto" ? null : DIFFICULTY_BANDS[difficulty];
  const inBand = (p: PuzzleDef) => !band || (p.rating >= band[0] && p.rating < band[1]);
  const base = PUZZLES.filter(inBand);
  const candidates = base.length > 0 ? base : PUZZLES;
  const unsolved = candidates.filter((p) => !progress.solved.includes(p.id) && p.id !== excludeId);
  const pool = unsolved.length > 0 ? unsolved : candidates.filter((p) => p.id !== excludeId);
  const sorted = [...pool].sort(
    (a, b) => Math.abs(a.rating - progress.rating) - Math.abs(b.rating - progress.rating),
  );
  // small random window among the closest 5 so play isn't a fixed sequence
  const window = sorted.slice(0, Math.min(5, sorted.length));
  return window[Math.floor(Math.random() * window.length)];
}

/** Elo update for a puzzle attempt (puzzle plays the role of the opponent). */
export function puzzleElo(progress: PuzzleProgress, puzzle: PuzzleDef, solved: boolean): number {
  const k = progress.attempts < 20 ? 48 : 24;
  const expected = 1 / (1 + Math.pow(10, (puzzle.rating - progress.rating) / 400));
  return Math.round(progress.rating + k * ((solved ? 1 : 0) - expected));
}

const STORAGE_KEY = "rr.puzzles.v1";

export function loadProgress(): PuzzleProgress {
  if (typeof window === "undefined") return { ...DEFAULT_PUZZLE_PROGRESS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PUZZLE_PROGRESS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PUZZLE_PROGRESS };
}

export function saveProgress(p: PuzzleProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
