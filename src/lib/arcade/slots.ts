/** 3-reel slot machine with weighted symbol frequencies and a 3-of-a-kind paytable. */
export const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"] as const;
export type SlotSymbol = (typeof SYMBOLS)[number];

const WEIGHTS: Record<SlotSymbol, number> = { "🍒": 30, "🍋": 25, "🔔": 20, "⭐": 15, "💎": 7, "7️⃣": 3 };
export const PAYOUTS: Record<SlotSymbol, number> = { "🍒": 3, "🍋": 5, "🔔": 10, "⭐": 20, "💎": 50, "7️⃣": 100 };

function weightedPick(): SlotSymbol {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    r -= WEIGHTS[s];
    if (r <= 0) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

export function spin(): [SlotSymbol, SlotSymbol, SlotSymbol] {
  return [weightedPick(), weightedPick(), weightedPick()];
}

/** 3-of-a-kind pays the symbol's multiplier; exactly 2 cherries is a small consolation payout (1:1). */
export function payout(reels: [SlotSymbol, SlotSymbol, SlotSymbol], bet: number): number {
  if (reels[0] === reels[1] && reels[1] === reels[2]) return bet * PAYOUTS[reels[0]];
  if (reels.filter((s) => s === "🍒").length === 2) return bet;
  return 0;
}
