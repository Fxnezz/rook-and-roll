// Original word list themed around the site's own games — no external source.
export const HANGMAN_WORDS = [
  "CHESS", "KNIGHT", "BISHOP", "CASTLE", "PAWN", "CHECKMATE", "STALEMATE",
  "GAMBIT", "ENDGAME", "OPENING", "TACTICS", "PUZZLE", "ROOK", "QUEEN",
  "CHECKERS", "MANCALA", "OTHELLO", "GOMOKU", "DOMINO", "MARBLE",
  "ARCADE", "SUDOKU", "SOLITAIRE", "MINESWEEPER", "BREAKOUT", "PADDLE",
  "JOYSTICK", "PIXEL", "COMBO", "SCOREBOARD", "LEADERBOARD", "RATING",
];

export const MAX_WRONG = 6;

export interface HangmanState {
  word: string;
  guessed: Set<string>;
}

export function pickWord(): string {
  return HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
}

export function newGame(): HangmanState {
  return { word: pickWord(), guessed: new Set() };
}

export function guessLetter(state: HangmanState, letter: string): HangmanState {
  const next = new Set(state.guessed);
  next.add(letter.toUpperCase());
  return { word: state.word, guessed: next };
}

export function wrongGuesses(state: HangmanState): number {
  return [...state.guessed].filter((l) => !state.word.includes(l)).length;
}

export function isWon(state: HangmanState): boolean {
  return [...state.word].every((c) => state.guessed.has(c));
}

export function isLost(state: HangmanState): boolean {
  return wrongGuesses(state) >= MAX_WRONG;
}

export function displayWord(state: HangmanState): string {
  return [...state.word].map((c) => (state.guessed.has(c) ? c : "_")).join(" ");
}
