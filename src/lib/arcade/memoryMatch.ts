export interface MemoryCard {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

const SYMBOLS = ["♟", "♞", "♜", "♝", "♛", "♚", "🐍", "🧱", "🔢", "🏎️", "✨", "🟢", "🎲", "🧩", "🔴", "⚫", "✕", "⭕", "🃏", "🥇"];

export const MEMORY_SIZES: Record<string, { pairs: number; cols: number }> = {
  small: { pairs: 8, cols: 4 },
  medium: { pairs: 12, cols: 6 },
  large: { pairs: 18, cols: 6 },
};

export function newDeck(pairs: number): MemoryCard[] {
  const chosen = SYMBOLS.slice(0, pairs);
  const cards: MemoryCard[] = [];
  let id = 0;
  for (const symbol of chosen) {
    cards.push({ id: id++, symbol, flipped: false, matched: false });
    cards.push({ id: id++, symbol, flipped: false, matched: false });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
