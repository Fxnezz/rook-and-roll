import type { Level, Collectible } from "./levels";
import type { Rect } from "./physics";

/**
 * Procedural level generator — builds a guaranteed-completable run of
 * platforms left to right. "Guaranteed" here means empirical, not proven
 * from first-principles physics: gap/step sizes are clamped to the same
 * ranges used successfully by the hand-built "Rooftop Run" / "Gap Gauntlet"
 * levels (which are known-completable with run + double-jump), rather than
 * deriving a reachability envelope from the physics constants directly.
 *
 * Deterministic per seed (mulberry32), so the same seed always regenerates
 * the same layout. The same per-platform step logic (`nextPlatformStep`)
 * backs both the finite "Random Run" mode and the endless Infinite Run mode.
 */
export function mulberry32(seed: number): () => number {
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

export interface PlatformStep {
  platform: Rect;
  hazard: Rect | null;
  collectible: Collectible | null;
  prevEnd: number;
  prevY: number;
}

/**
 * Picks the next platform given where the previous one ended. `hazardChance`
 * and `widthBias` (0..1, shrinks the width range) are exposed so Infinite
 * Run can ramp difficulty gently with distance while staying inside the
 * same proven-reachable gap/step bounds.
 */
export function nextPlatformStep(
  rng: () => number,
  prevEnd: number,
  prevY: number,
  opts: { hazardChance?: number; widthBias?: number } = {},
): PlatformStep {
  const hazardChance = opts.hazardChance ?? HAZARD_CHANCE;
  const widthBias = opts.widthBias ?? 0;

  const gap = MIN_GAP + rng() * (MAX_GAP - MIN_GAP);
  const maxW = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * widthBias * 0.5;
  const width = MIN_WIDTH + rng() * (maxW - MIN_WIDTH);
  let y = prevY + (rng() * 2 - 1) * MAX_STEP;
  y = Math.max(MIN_Y, Math.min(MAX_Y, y));

  const x = prevEnd + gap;
  const platform: Rect = { x, y, w: width, h: PLATFORM_H };

  let hazard: Rect | null = null;
  if (gap > 95 && rng() < hazardChance) {
    const hazardW = Math.min(gap - 20, 70);
    hazard = { x: prevEnd + (gap - hazardW) / 2, y: Math.max(prevY, y) + 40, w: hazardW, h: 20 };
  }

  let collectible: Collectible | null = null;
  if (rng() < 0.75) {
    collectible = { x: x + width / 2, y: y - 40 };
  }

  return { platform, hazard, collectible, prevEnd: x + width, prevY: y };
}

export function generateLevel(seed: number): GeneratedLevel {
  const rng = mulberry32(seed);
  const count = PLATFORM_COUNT_MIN + Math.floor(rng() * (PLATFORM_COUNT_MAX - PLATFORM_COUNT_MIN + 1));

  const platforms: Level["platforms"] = [];
  const hazards: Level["hazards"] = [];
  const collectibles: Level["collectibles"] = [];

  // First platform is a wide, comfortable starting ledge.
  platforms.push({ x: 0, y: 400, w: 260, h: PLATFORM_H + 30 });
  let prevEnd = 260;
  let prevY = 400;

  for (let i = 1; i < count; i++) {
    const step = nextPlatformStep(rng, prevEnd, prevY);
    platforms.push(step.platform);
    if (step.hazard) hazards.push(step.hazard);
    if (step.collectible) collectibles.push(step.collectible);
    prevEnd = step.prevEnd;
    prevY = step.prevY;
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
