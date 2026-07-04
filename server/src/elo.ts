// Standard Elo (mirrors src/lib/ratings/elo.ts in the web app).

export function kFactor(rating: number, games: number): number {
  if (games < 30) return 40;
  if (rating < 2100) return 20;
  if (rating < 2400) return 15;
  return 10;
}

function expected(r: number, o: number): number {
  return 1 / (1 + Math.pow(10, (o - r) / 400));
}

export function updateElo(rating: number, opp: number, score: 1 | 0.5 | 0, games = 30, kMultiplier = 1) {
  const k = kFactor(rating, games) * kMultiplier;
  const delta = Math.round(k * (score - expected(rating, opp)));
  return { rating: rating + delta, delta };
}
