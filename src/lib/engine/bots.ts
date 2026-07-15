import type { EngineLine } from "./stockfish";
import type { BotPersonality } from "@/lib/cheats/botManipulation";

export type BotTierId =
  | "pip"
  | "milo"
  | "nell"
  | "beau"
  | "cass"
  | "rosa"
  | "wren"
  | "dex"
  | "ilsa"
  | "vera"
  | "zephyr"
  | "titan"
  | "omen"
  | "samcore"
  | "sam";

export interface BotTier {
  id: BotTierId;
  name: string;
  /** Full display name, chess.com-bot style (e.g. "Rosa Marchetti"). */
  fullName: string;
  /** Country flag emoji shown next to the name. */
  flag: string;
  elo: number;
  /** Optional honest display label for experimental or unrated engines. */
  ratingLabel?: string;
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
  /** Stylistic move bias, layered on top of skill/depth — see choosePersonalityMove. */
  personality: BotPersonality;
  /** Non-Stockfish playing backend. Omitted bots use the bundled Stockfish core. */
  engine?: "sam-core";
  /** Per-engine depth ceiling used by setup controls. */
  maxDepth?: number;
}

export const BOT_TIERS: BotTier[] = [
  {
    id: "pip",
    name: "Pip",
    fullName: "Pip Ellison",
    flag: "🇬🇧",
    elo: 400,
    blurb: "Just learning the ropes. Makes plenty of mistakes.",
    skill: 0,
    depth: 3,
    multipv: 5,
    temperature: 2.0,
    accent: "#5bbf7a",
    personality: "normal",
  },
  {
    id: "milo",
    name: "Milo",
    fullName: "Milo Ferreira",
    flag: "🇧🇷",
    elo: 550,
    blurb: "Plays fast and loose — endearing chaos, no plan.",
    skill: 1,
    depth: 4,
    multipv: 5,
    temperature: 1.7,
    accent: "#4fd18f",
    personality: "random",
  },
  {
    id: "nell",
    name: "Nell",
    fullName: "Nell Okafor",
    flag: "🇳🇬",
    elo: 700,
    blurb: "Knows the basics but plays it timid and quiet.",
    skill: 3,
    depth: 5,
    multipv: 5,
    temperature: 1.3,
    accent: "#5aa8e0",
    personality: "passive",
  },
  {
    id: "beau",
    name: "Beau",
    fullName: "Beau Lambert",
    flag: "🇫🇷",
    elo: 850,
    blurb: "Loves a good scrap — charges into every trade.",
    skill: 5,
    depth: 6,
    multipv: 4,
    temperature: 1.0,
    accent: "#4a8fd6",
    personality: "aggressive",
  },
  {
    id: "cass",
    name: "Cass",
    fullName: "Cass Delgado",
    flag: "🇪🇸",
    elo: 1000,
    blurb: "A solid club player. Punishes loose moves.",
    skill: 7,
    depth: 7,
    multipv: 4,
    temperature: 0.8,
    accent: "#e9a23b",
    personality: "normal",
  },
  {
    id: "rosa",
    name: "Rosa",
    fullName: "Rosa Marchetti",
    flag: "🇮🇹",
    elo: 1150,
    blurb: "Sharp and swashbuckling — always hunting for tactics.",
    skill: 8,
    depth: 8,
    multipv: 4,
    temperature: 0.65,
    accent: "#e0b23b",
    personality: "aggressive",
  },
  {
    id: "wren",
    name: "Wren",
    fullName: "Wren Kobayashi",
    flag: "🇯🇵",
    elo: 1300,
    blurb: "Patient and positional. Grinds you down slowly.",
    skill: 9,
    depth: 9,
    multipv: 3,
    temperature: 0.5,
    accent: "#d8943a",
    personality: "passive",
  },
  {
    id: "dex",
    name: "Dex",
    fullName: "Dex Mercer",
    flag: "🇺🇸",
    elo: 1450,
    blurb: "Balanced and dangerous. Nothing gets past him twice.",
    skill: 11,
    depth: 10,
    multipv: 3,
    temperature: 0.4,
    accent: "#e5843a",
    personality: "normal",
  },
  {
    id: "ilsa",
    name: "Ilsa",
    fullName: "Ilsa Bergström",
    flag: "🇸🇪",
    elo: 1600,
    blurb: "Relentless attacker. Punishes hesitation instantly.",
    skill: 13,
    depth: 11,
    multipv: 3,
    temperature: 0.32,
    accent: "#e06a3a",
    personality: "aggressive",
  },
  {
    id: "vera",
    name: "Vera",
    fullName: "Vera Kowalska",
    flag: "🇵🇱",
    elo: 1750,
    blurb: "Strong and calculating. Hard to fool.",
    skill: 15,
    depth: 13,
    multipv: 2,
    temperature: 0.22,
    accent: "#e5604d",
    personality: "normal",
  },
  {
    id: "zephyr",
    name: "Zephyr",
    fullName: "Zephyr Cole",
    flag: "🇨🇦",
    elo: 1900,
    blurb: "Ice-cold and precise. Waits for your one mistake.",
    skill: 17,
    depth: 15,
    multipv: 2,
    temperature: 0.15,
    accent: "#d9503f",
    personality: "passive",
  },
  {
    id: "titan",
    name: "Titan",
    fullName: "TITAN-7",
    flag: "🤖",
    elo: 2150,
    blurb: "Blisteringly sharp. Attacks from move one.",
    skill: 19,
    depth: 17,
    multipv: 2,
    temperature: 0.08,
    accent: "#c8443a",
    personality: "aggressive",
  },
  {
    id: "omen",
    name: "Omen",
    fullName: "The Omen",
    flag: "🌑",
    elo: 2400,
    blurb: "Full strength, deep search, no mercy.",
    skill: 20,
    depth: 20,
    multipv: 1,
    temperature: 0,
    accent: "#b83a3a",
    personality: "normal",
  },
  {
    id: "samcore",
    name: "Sam Core",
    fullName: "Sam Core X1",
    flag: "🧠",
    elo: 1750,
    ratingLabel: "Experimental · unrated",
    blurb: "A brand-new original browser engine: independent search, evaluation and move ordering with no Stockfish calls.",
    skill: 20,
    depth: 5,
    multipv: 3,
    temperature: 0,
    accent: "#9b7cff",
    personality: "normal",
    engine: "sam-core",
    maxDepth: 8,
  },
  {
    id: "sam",
    name: "Sam Engine",
    fullName: "Sam Engine S1",
    flag: "⚡",
    elo: 3200,
    blurb: "An experimental maximum-strength arcade engine profile with configurable search depth, candidate breadth and playing style.",
    skill: 20,
    depth: 26,
    multipv: 1,
    temperature: 0,
    accent: "#52d6c8",
    personality: "normal",
  },
];

export function getTier(id: BotTierId): BotTier {
  return BOT_TIERS.find((t) => t.id === id) ?? BOT_TIERS[4];
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
