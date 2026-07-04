import type { Level } from "./levels";

/**
 * Procedural level generator — builds a guaranteed-completable run of
 * platforms left to right. "Guaranteed" here means empirical, not proven
 * from first-principles physics: gap/step sizes are clamped to the same
 * ranges used successfully by the hand-built "Rooftop Run" / "Gap Gauntlet"
 * levels (which are known-completable with run + double-jump), rather than
 * deriving a reachability envelope from the physics constants directly.
 *
 * Deterministic per seed (mulberry32), so the same seed always regenerates
 * the same layout.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN_GAP = 85;
const MAX_GAP = 155;
const MIN_WIDTH = 90;
const MAX_WIDTH = 190;
const MIN_Y = 220;
const MAX_Y = 440;
const MAX_STEP = 110; // max vertical change between consecutive platforms
const PLATFORM_H = 30;
const HAZARD_CHANCE = 0.45;
const PLATFORM_COUNT_MIN = 9;
const PLATFORM_COUNT_MAX = 13;

// A handful of skin variants so different seeds don't all look identical —
// purely cosmetic, consumed by PlatformerGame's renderer.
export const LEVEL_SKINS = ["meadow", "dusk", "frost"] as const;
export type LevelSkin = (typeof LEVEL_SKINS)[number];

export interface GeneratedLevel extends Level {
  seed: number;
  skin: LevelSkin;
}

export function generateLevel(seed: number): GeneratedLevel {
  const rng = mulberry32(seed);
  const count = PLATFORM_COUNT_MIN + Math.floor(rng() * (PLATFORM_COUNT_MAX - PLATFORM_COUNT_MIN + 1));

  const platforms: Level["platforms"] = [];
  const hazards: Level["hazards"] = [];
  const collectibles: Level["collectibles"] = [];

  // First platform is a wide, comfortable starting ledge.
  let x = 0;
  let y = 400;
  platforms.push({ x, y, w: 260, h: PLATFORM_H + 30 });
  let prevEnd = x + 260;
  let prevY = y;

  for (let i = 1; i < count; i++) {
    const gap = MIN_GAP + rng() * (MAX_GAP - MIN_GAP);
    const width = MIN_WIDTH + rng() * (MAX_WIDTH - MIN_WIDTH);
    let nextY = prevY + (rng() * 2 - 1) * MAX_STEP;
    nextY = Math.max(MIN_Y, Math.min(MAX_Y, nextY));

    x = prevEnd + gap;
    y = nextY;
    platforms.push({ x, y, w: width, h: PLATFORM_H });

    // A hazard in the gap between this platform and the previous one —
    // skip it if the gap is too tight to look/feel fair.
    if (gap > 95 && rng() < HAZARD_CHANCE) {
      const hazardW = Math.min(gap - 20, 70);
      hazards.push({ x: prevEnd + (gap - hazardW) / 2, y: Math.max(prevY, y) + 40, w: hazardW, h: 20 });
    }

    // A collectible floats above most platforms.
    if (rng() < 0.75) {
      collectibles.push({ x: x + width / 2, y: y - 40 });
    }

    prevEnd = x + width;
    prevY = y;
  }

  const goal: Level["goal"] = { x: prevEnd - 50, y: prevY, w: 40, h: 60 };
  const width = prevEnd + 120;
  const skin = LEVEL_SKINS[Math.floor(rng() * LEVEL_SKINS.length)];

  return {
    id: `random-${seed}`,
    name: "Random Run",
    width,
    height: 480,
    spawn: { x: 60, y: 380 },
    platforms,
    hazards,
    collectibles,
    goal,
    seed,
    skin,
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
