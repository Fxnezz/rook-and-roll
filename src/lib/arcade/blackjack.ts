export type Suit = "S" | "H" | "D" | "C";

export interface Card {
  suit: Suit;
  rank: number; // 1 (Ace) .. 13 (King)
}

const SUITS: Suit[] = ["S", "H", "D", "C"];

export function freshShoe(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function cardValue(rank: number): number {
  if (rank === 1) return 11;
  if (rank >= 11) return 10;
  return rank;
}

/** Best total for a hand, treating aces as 11 unless that busts. */
export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = cards.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces = cards.filter((c) => c.rank === 1).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  const soft = aces > 0 && total <= 21;
  return { total, soft };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21;
}

/** Dealer hits until 17 or more (stands on soft 17). */
export function dealerShouldHit(cards: Card[]): boolean {
  return handValue(cards).total < 17;
}

export const RANK_LABEL: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };
export const SUIT_GLYPH: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
export function isRedSuit(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}
