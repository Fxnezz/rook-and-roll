import linesJson from "./lines.json";

export interface OpeningLine {
  name: string;
  moves: string[]; // SAN from the initial position
}

export const OPENING_LINES = linesJson as OpeningLine[];

export interface ExplorerEntry {
  san: string;
  /** how many book lines continue with this move */
  lines: number;
  /** name of the most specific line reached after playing it */
  name: string | null;
}

export interface ExplorerResult {
  /** name of the deepest line matching the current move sequence */
  currentName: string | null;
  /** book continuations from this position */
  continuations: ExplorerEntry[];
  inBook: boolean;
}

function prefixMatches(line: OpeningLine, history: string[]): boolean {
  if (history.length > line.moves.length) return false;
  return history.every((san, i) => line.moves[i] === san);
}

/** Longest named line that is a prefix of (or equal to) the history. */
function nameFor(history: string[]): string | null {
  let best: OpeningLine | null = null;
  for (const line of OPENING_LINES) {
    if (line.moves.length <= history.length && line.moves.every((m, i) => history[i] === m)) {
      if (!best || line.moves.length > best.moves.length) best = line;
    }
  }
  return best?.name ?? null;
}

export function explore(history: string[]): ExplorerResult {
  const matching = OPENING_LINES.filter((l) => prefixMatches(l, history));
  const byMove = new Map<string, { lines: number; deepest: OpeningLine | null }>();
  for (const line of matching) {
    const next = line.moves[history.length];
    if (!next) continue;
    const cur = byMove.get(next) ?? { lines: 0, deepest: null };
    cur.lines += 1;
    if (line.moves.length === history.length + 1) cur.deepest = line;
    byMove.set(next, cur);
  }
  const continuations: ExplorerEntry[] = [...byMove.entries()]
    .map(([san, v]) => ({
      san,
      lines: v.lines,
      name: v.deepest?.name ?? nameFor([...history, san]),
    }))
    .sort((a, b) => b.lines - a.lines);

  return {
    currentName: nameFor(history),
    continuations,
    inBook: matching.length > 0,
  };
}
