import type { EngineLine } from "./stockfish";

export type BotTierId = "beginner" | "easy" | "medium" | "hard" | "expert";

export interface BotTier {
  id: BotTierId;
  name: string;
  elo: number;
  blurb: string;
  /** Stockfish Skill Level 0–20 */
  skill: number;
  /** search depth cap */
  depth: number;
  /** candidate lines to request (MultiPV) */
  multipv: number;
  /**
   * Softmax temperature over candidate evaluations. 0 = always the top move;
   * higher = more willing to pick a weaker candidate (weaker, more human play).
   */
  temperature: number;
  /** avatar accent colour */
  accent: string;
}

export const BOT_TIERS: BotTier[] = [
  {
    id: "beginner",
    name: "Pip",
    elo: 500,
    blurb: "Just learning the ropes. Makes plenty of mistakes.",
    skill: 1,
    depth: 4,
    multipv: 5,
    temperature: 1.6,
    accent: "#5bbf7a",
  },
  {
    id: "easy",
    name: "Nell",
    elo: 900,
    blurb: "Knows the basics but misses tactics.",
    skill: 5,
    depth: 6,
    multipv: 4,
    temperature: 0.9,
    accent: "#5aa8e0",
  },
  {
    id: "medium",
    name: "Cass",
    elo: 1300,
    blurb: "A solid club player. Punishes loose moves.",
    skill: 9,
    depth: 9,
    multipv: 3,
    temperature: 0.5,
    accent: "#e9a23b",
  },
  {
    id: "hard",
    name: "Vera",
    elo: 1700,
    blurb: "Strong and calculating. Hard to fool.",
    skill: 15,
    depth: 13,
    multipv: 2,
    temperature: 0.22,
    accent: "#e5843a",
  },
  {
    id: "expert",
    name: "Titan",
    elo: 2200,
    blurb: "Full strength, deep search, no mercy.",
    skill: 20,
    depth: 18,
    multipv: 1,
    temperature: 0,
    accent: "#e5604d",
  },
];

export function getTier(id: BotTierId): BotTier {
  return BOT_TIERS.find((t) => t.id === id) ?? BOT_TIERS[2];
}

/** Numeric score of a candidate line from the side-to-move's perspective. */
function lineScore(line: EngineLine): number {
  if (line.mate != null) return line.mate > 0 ? 100000 - line.mate : -100000 - line.mate;
  return line.cp ?? 0;
}

/**
 * Choose a move among candidate lines using a temperature-weighted softmax.
 * Weak tiers (high temperature) will sometimes pick a sub-optimal candidate,
 * producing beginner-like play rather than a slightly-nerfed grandmaster.
 */
export function chooseMove(lines: EngineLine[], tier: BotTier, rng: () => number = Math.random): string {
  if (lines.length === 0) throw new Error("no candidate moves");
  if (lines.length === 1 || tier.temperature <= 0) return lines[0].move;

  const candidates = lines.slice(0, tier.multipv);
  const scores = candidates.map(lineScore);
  const best = Math.max(...scores);
  // temperature scales in pawns (÷100 cp)
  const t = tier.temperature * 100;
  const weights = scores.map((s) => Math.exp((s - best) / t));
  const total = weights.reduce((a, b) => a + b, 0);

  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i].move;
  }
  return candidates[0].move;
}
