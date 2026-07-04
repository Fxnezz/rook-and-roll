import answers from "./answers.json";
import guessesList from "./guesses.json";

export const ANSWERS: string[] = answers;
const GUESS_SET = new Set<string>(guessesList as string[]);

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export function isValidGuess(word: string): boolean {
  return GUESS_SET.has(word.toLowerCase());
}

/** Deterministic UTC-date hash, same approach as the daily chess puzzle. */
function dateHash(date: Date): number {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  let h = 2166136261;
  for (const ch of key) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyWord(date: Date = new Date()): string {
  return ANSWERS[dateHash(date) % ANSWERS.length];
}

export function dailyKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function randomWord(rng: () => number = Math.random): string {
  return ANSWERS[Math.floor(rng() * ANSWERS.length)];
}

export type LetterState = "correct" | "present" | "absent";

/**
 * Standard two-pass Wordle scoring, correctly handling duplicate letters:
 * pass 1 marks exact position matches and consumes them from the answer's
 * letter pool; pass 2 marks "present" only while there's still an
 * unconsumed copy of that letter left in the pool.
 */
export function scoreGuess(guess: string, answer: string): LetterState[] {
  const g = guess.toLowerCase().split("");
  const a = answer.toLowerCase().split("");
  const result: LetterState[] = Array(g.length).fill("absent");
  const pool: Record<string, number> = {};

  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) {
      result[i] = "correct";
    } else {
      pool[a[i]] = (pool[a[i]] ?? 0) + 1;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === "correct") continue;
    const letter = g[i];
    if (pool[letter] > 0) {
      result[i] = "present";
      pool[letter] -= 1;
    }
  }
  return result;
}

/** Builds a Wordle-style shareable result: emoji grid, no letters revealed. */
export function buildShareText(
  label: string,
  rows: { states: LetterState[] }[],
  won: boolean,
): string {
  const EMOJI: Record<LetterState, string> = { correct: "🟩", present: "🟨", absent: "⬜" };
  const guessLine = won ? `${rows.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = rows.map((r) => r.states.map((s) => EMOJI[s]).join("")).join("\n");
  return `Rook & Roll Word Game — ${label} ${guessLine}\n${grid}`;
}

/** Merge a new guess's letter states into a running best-known keyboard state. */
export function mergeKeyboardState(
  cur: Record<string, LetterState>,
  guess: string,
  states: LetterState[],
): Record<string, LetterState> {
  const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };
  const next = { ...cur };
  guess.split("").forEach((letter, i) => {
    const l = letter.toLowerCase();
    const s = states[i];
    if (!next[l] || rank[s] > rank[next[l]]) next[l] = s;
  });
  return next;
}
