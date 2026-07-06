export const CATEGORIES = [
  "ones", "twos", "threes", "fours", "fives", "sixes",
  "threeKind", "fourKind", "fullHouse", "smallStraight", "largeStraight", "yahtzee", "chance",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  ones: "Ones", twos: "Twos", threes: "Threes", fours: "Fours", fives: "Fives", sixes: "Sixes",
  threeKind: "Three of a Kind", fourKind: "Four of a Kind", fullHouse: "Full House",
  smallStraight: "Small Straight", largeStraight: "Large Straight", yahtzee: "Yahtzee", chance: "Chance",
};

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
}

function counts(dice: number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0]; // index 1..6
  for (const d of dice) c[d]++;
  return c;
}

function sumOf(dice: number[], face: number): number {
  return dice.filter((d) => d === face).length * face;
}

export function scoreFor(category: Category, dice: number[]): number {
  const c = counts(dice);
  const total = dice.reduce((s, d) => s + d, 0);
  switch (category) {
    case "ones": return sumOf(dice, 1);
    case "twos": return sumOf(dice, 2);
    case "threes": return sumOf(dice, 3);
    case "fours": return sumOf(dice, 4);
    case "fives": return sumOf(dice, 5);
    case "sixes": return sumOf(dice, 6);
    case "threeKind": return c.some((n) => n >= 3) ? total : 0;
    case "fourKind": return c.some((n) => n >= 4) ? total : 0;
    case "fullHouse": {
      const vals = c.slice(1).filter((n) => n > 0);
      const hasThree = vals.includes(3);
      const hasTwo = vals.includes(2);
      // Five of a kind also counts as a full house in most house rules used here.
      return (hasThree && hasTwo) || vals.includes(5) ? 25 : 0;
    }
    case "smallStraight": {
      const set = new Set(dice);
      const runs = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
      return runs.some((run) => run.every((v) => set.has(v))) ? 30 : 0;
    }
    case "largeStraight": {
      const set = new Set(dice);
      const runs = [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];
      return runs.some((run) => run.every((v) => set.has(v)) && set.size === 5) ? 40 : 0;
    }
    case "yahtzee": return c.some((n) => n === 5) ? 50 : 0;
    case "chance": return total;
  }
}

export type Scorecard = Partial<Record<Category, number>>;

export function upperTotal(card: Scorecard): number {
  return (["ones", "twos", "threes", "fours", "fives", "sixes"] as Category[]).reduce((s, cat) => s + (card[cat] ?? 0), 0);
}

export function upperBonus(card: Scorecard): number {
  return upperTotal(card) >= 63 ? 35 : 0;
}

export function grandTotal(card: Scorecard): number {
  const lower = (CATEGORIES.filter((c) => !c.match(/ones|twos|threes|fours|fives|sixes/)) as Category[]).reduce(
    (s, cat) => s + (card[cat] ?? 0),
    0,
  );
  return upperTotal(card) + upperBonus(card) + lower;
}

export function isComplete(card: Scorecard): boolean {
  return CATEGORIES.every((c) => card[c] !== undefined);
}
