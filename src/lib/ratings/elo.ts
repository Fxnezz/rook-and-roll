/**
 * Standard Elo rating system with a rating-dependent K-factor.
 * Ratings are kept separately per time-control category.
 */

export type RatedResult = 1 | 0.5 | 0; // score for the player in question

export type RatingCategory = "bullet" | "blitz" | "rapid" | "classical" | "puzzle";

/** K-factor: bigger swings for new/lower players, smaller for established ones. */
export function kFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40;
  if (rating < 2100) return 20;
  if (rating < 2400) return 15;
  return 10;
}

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
}

export interface EloUpdate {
  rating: number;
  delta: number;
}

export function updateElo(
  rating: number,
  opponentRating: number,
  score: RatedResult,
  gamesPlayed = 30,
): EloUpdate {
  const k = kFactor(rating, gamesPlayed);
  const expected = expectedScore(rating, opponentRating);
  const delta = Math.round(k * (score - expected));
  return { rating: rating + delta, delta };
}

/** Convenience: compute both players' new ratings from a game result. */
export function applyGameElo(
  whiteRating: number,
  blackRating: number,
  result: "WHITE_WINS" | "BLACK_WINS" | "DRAW",
  whiteGames = 30,
  blackGames = 30,
): { white: EloUpdate; black: EloUpdate } {
  const whiteScore: RatedResult = result === "WHITE_WINS" ? 1 : result === "DRAW" ? 0.5 : 0;
  const blackScore: RatedResult = (1 - whiteScore) as RatedResult;
  return {
    white: updateElo(whiteRating, blackRating, whiteScore, whiteGames),
    black: updateElo(blackRating, whiteRating, blackScore, blackGames),
  };
}

export const ratingFieldFor: Record<
  Exclude<RatingCategory, "puzzle">,
  "ratingBullet" | "ratingBlitz" | "ratingRapid" | "ratingClassical"
> = {
  bullet: "ratingBullet",
  blitz: "ratingBlitz",
  rapid: "ratingRapid",
  classical: "ratingClassical",
};
