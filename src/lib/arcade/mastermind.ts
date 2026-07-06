/**
 * Mastermind: guess a secret 4-peg code (6 possible colors, repeats
 * allowed) within a limited number of tries. Feedback per guess: black pegs
 * for correct color in the correct position, white pegs for correct color
 * in the wrong position — colors already matched black aren't reused for
 * white (standard Mastermind scoring).
 */
export const CODE_LENGTH = 4;
export const COLOR_COUNT = 6;
export const MAX_GUESSES = 10;

export function randomCode(): number[] {
  return Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * COLOR_COUNT));
}

export interface Feedback {
  black: number;
  white: number;
}

export function score(secret: number[], guess: number[]): Feedback {
  let black = 0;
  const secretRemain: number[] = [];
  const guessRemain: number[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secret[i] === guess[i]) {
      black++;
    } else {
      secretRemain.push(secret[i]);
      guessRemain.push(guess[i]);
    }
  }
  let white = 0;
  const counts = new Map<number, number>();
  for (const s of secretRemain) counts.set(s, (counts.get(s) ?? 0) + 1);
  for (const g of guessRemain) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      white++;
      counts.set(g, c - 1);
    }
  }
  return { black, white };
}

export function isWin(fb: Feedback): boolean {
  return fb.black === CODE_LENGTH;
}
