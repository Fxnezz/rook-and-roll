import { freshShoe, type Card } from "./blackjack";

/** Video poker, Jacks or Better, standard 9/6 paytable (1-credit bet). */
export type HandName =
  | "Royal Flush"
  | "Straight Flush"
  | "Four of a Kind"
  | "Full House"
  | "Flush"
  | "Straight"
  | "Three of a Kind"
  | "Two Pair"
  | "Jacks or Better"
  | "Nothing";

export const PAYTABLE: Record<HandName, number> = {
  "Royal Flush": 250,
  "Straight Flush": 50,
  "Four of a Kind": 25,
  "Full House": 9,
  Flush: 6,
  Straight: 4,
  "Three of a Kind": 3,
  "Two Pair": 2,
  "Jacks or Better": 1,
  Nothing: 0,
};

function isStraight(ranks: number[]): boolean {
  const sorted = [...new Set(ranks)].sort((a, b) => a - b);
  if (sorted.length !== 5) return false;
  if (sorted.join() === [1, 2, 3, 4, 5].join()) return true; // ace-low
  if (sorted.join() === [1, 10, 11, 12, 13].join()) return true; // ace-high
  for (let i = 1; i < sorted.length; i++) if (sorted[i] !== sorted[i - 1] + 1) return false;
  return true;
}

export function evaluateHand(cards: Card[]): HandName {
  const ranks = cards.map((c) => c.rank);
  const suits = cards.map((c) => c.suit);
  const flush = suits.every((s) => s === suits[0]);
  const straight = isStraight(ranks);

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const countValues = [...counts.values()].sort((a, b) => b - a);

  const sortedRanks = [...new Set(ranks)].sort((a, b) => a - b);
  const isRoyal = flush && straight && sortedRanks.join() === [1, 10, 11, 12, 13].join();

  if (isRoyal) return "Royal Flush";
  if (flush && straight) return "Straight Flush";
  if (countValues[0] === 4) return "Four of a Kind";
  if (countValues[0] === 3 && countValues[1] === 2) return "Full House";
  if (flush) return "Flush";
  if (straight) return "Straight";
  if (countValues[0] === 3) return "Three of a Kind";
  if (countValues[0] === 2 && countValues[1] === 2) return "Two Pair";
  if (countValues[0] === 2) {
    const pairRank = [...counts.entries()].find(([, c]) => c === 2)![0];
    if (pairRank === 1 || pairRank >= 11) return "Jacks or Better";
  }
  return "Nothing";
}

export interface VideoPokerRound {
  hand: Card[];
  held: boolean[];
  deck: Card[];
  stage: "hold" | "result";
  result?: HandName;
}

export function deal(): VideoPokerRound {
  const deck = freshShoe();
  return { hand: deck.slice(0, 5), held: Array(5).fill(false), deck: deck.slice(5), stage: "hold" };
}

export function draw(round: VideoPokerRound): VideoPokerRound {
  const deck = [...round.deck];
  const hand = round.hand.map((c, i) => (round.held[i] ? c : deck.shift()!));
  const result = evaluateHand(hand);
  return { hand, held: round.held, deck, stage: "result", result };
}
