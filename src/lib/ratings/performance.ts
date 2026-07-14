/**
 * Rough single-game "performance rating" estimate: opponent rating shifted by
 * ±400 for a win/loss, unchanged for a draw. This is the common casual
 * approximation (not the full FIDE dp-table, which only really means
 * something over many games) — good enough for a quick postgame readout.
 */
export function performanceRating(opponentRating: number, outcome: "win" | "loss" | "draw"): number {
  if (outcome === "win") return opponentRating + 400;
  if (outcome === "loss") return opponentRating - 400;
  return opponentRating;
}
