/**
 * Which HighScore-tracked mini-games rank "higher score is better" vs
 * "lower score/time is better". Shared by the profile page's per-game
 * best-score cards and the global per-game leaderboard.
 */
export const HIGHER_IS_BETTER_GAMES: string[] = [
  "snake",
  "tetris",
  "2048",
  "simon",
  "breakout",
  "whackamole",
  "blackjack",
  "yahtzee",
  "hangman",
  "flappyrook",
  "videopoker",
  "pong",
  "spaceinvaders",
  "blockpuzzle",
  "match3",
  "asteroids",
  "frogger",
  "roulette",
  "baccarat",
  "craps",
  "slots",
  "rps",
  "farkle",
];

export const LOWER_IS_BETTER_GAMES: string[] = [
  "racing",
  "platformer",
  "minesweeper",
  "memorymatch",
  "15puzzle",
  "sudoku",
  "solitaire",
  "freecell",
  "klotski",
  "pegsolitaire",
  "lightsout",
  "hanoi",
  "mastermind",
  "battleship",
  "war",
  "pyramidsolitaire",
  "sokoban",
  "floodit",
  "spidersolitaire",
  "wordsearch",
];

export const ALL_HIGHSCORE_GAMES: string[] = [...HIGHER_IS_BETTER_GAMES, ...LOWER_IS_BETTER_GAMES];

const LABEL_OVERRIDES: Record<string, string> = {
  "2048": "2048",
  "15puzzle": "15 Puzzle",
  whackamole: "Whack-a-Mole",
  flappyrook: "Flappy Rook",
  videopoker: "Video Poker",
  spaceinvaders: "Space Invaders",
  blockpuzzle: "Block Puzzle",
  match3: "Match 3",
  rps: "Rock Paper Scissors",
  memorymatch: "Memory Match",
  pegsolitaire: "Peg Solitaire",
  lightsout: "Lights Out",
  pyramidsolitaire: "Pyramid Solitaire",
  spidersolitaire: "Spider Solitaire",
  wordsearch: "Word Search",
  racing: "Circuit Dash",
  platformer: "Spark's Climb",
};

/** Human-friendly display label for a HighScore game id. */
export function highScoreGameLabel(game: string): string {
  if (LABEL_OVERRIDES[game]) return LABEL_OVERRIDES[game];
  return game.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

/** Whether a lower score/time is "better" for this game; defaults to higher-is-better for unknown ids. */
export function isLowerBetter(game: string): boolean {
  return LOWER_IS_BETTER_GAMES.includes(game);
}

/** Formats a raw HighScore.score for display — racing/platformer store milliseconds. */
export function formatHighScoreValue(game: string, score: number): string {
  if (game === "racing" || game === "platformer") return `${(score / 1000).toFixed(2)}s`;
  return String(score);
}
