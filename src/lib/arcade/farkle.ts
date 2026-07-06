/**
 * Farkle scoring for a set of kept dice (1-6 values). Handles the full-6-dice
 * straight and three-pairs bonuses, then per-value combos: 3-of-a-kind is
 * the base score (1000 for ones, value x100 otherwise), each additional die
 * of that value doubles it (so 4-of-a-kind = 2x, 5 = 3x, 6 = 4x), and any
 * leftover single 1s/5s outside a 3+ group score 100/50 each.
 */
export function scoreDice(dice: number[]): number {
  const counts = [0, 0, 0, 0, 0, 0, 0]; // index 1-6
  for (const d of dice) counts[d]++;

  if (dice.length === 6) {
    if (counts.slice(1).every((c) => c === 1)) return 1500; // straight 1-6
    if (counts.slice(1).filter((c) => c === 2).length === 3) return 1500; // three pairs
  }

  let score = 0;
  for (let v = 1; v <= 6; v++) {
    const c = counts[v];
    if (c >= 3) {
      const base = v === 1 ? 1000 : v * 100;
      score += base * (c - 2);
    } else if (v === 1) {
      score += c * 100;
    } else if (v === 5) {
      score += c * 50;
    }
  }
  return score;
}

/** True if no subset of the rolled dice can score anything (a "Farkle" — turn score is lost). */
export function isFarkle(dice: number[]): boolean {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  if (dice.length === 6) {
    if (counts.slice(1).every((c) => c === 1)) return false;
    if (counts.slice(1).filter((c) => c === 2).length === 3) return false;
  }
  if (counts[1] > 0 || counts[5] > 0) return false;
  if (counts.slice(1).some((c) => c >= 3)) return false;
  return true;
}

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
}
