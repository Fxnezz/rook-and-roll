import type { Rect } from "./physics";

export interface Collectible {
  x: number;
  y: number;
}

export interface Checkpoint {
  x: number;
  y: number;
}

/** A platform that oscillates back and forth along one axis (sine motion). */
export interface MovingPlatform {
  baseX: number;
  baseY: number;
  w: number;
  h: number;
  axis: "x" | "y";
  range: number; // +/- distance from base position
  speed: number; // radians/sec
}

export interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  platforms: Rect[];
  hazards: Rect[];
  collectibles: Collectible[];
  goal: Rect;
  checkpoints?: Checkpoint[];
  movers?: MovingPlatform[];
}

/** Computes a moving platform's current rect at time `t` (seconds). */
export function moverRectAt(m: MovingPlatform, t: number): Rect {
  const offset = Math.sin(t * m.speed) * m.range;
  return {
    x: m.baseX + (m.axis === "x" ? offset : 0),
    y: m.baseY + (m.axis === "y" ? offset : 0),
    w: m.w,
    h: m.h,
  };
}

/** Original level geometry — a small original "Spark" character's world, not
 *  based on any existing game's level design. */
export const LEVELS: Level[] = [
  {
    id: "1",
    name: "Rooftop Run",
    width: 1400,
    height: 480,
    spawn: { x: 60, y: 380 },
    platforms: [
      { x: 0, y: 420, w: 260, h: 60 },
      { x: 320, y: 420, w: 180, h: 60 },
      { x: 560, y: 360, w: 140, h: 30 },
      { x: 760, y: 300, w: 140, h: 30 },
      { x: 960, y: 360, w: 160, h: 30 },
      { x: 1180, y: 420, w: 220, h: 60 },
    ],
    hazards: [
      { x: 260, y: 460, w: 60, h: 20 },
      { x: 500, y: 460, w: 60, h: 20 },
      { x: 700, y: 460, w: 60, h: 20 },
      { x: 900, y: 460, w: 60, h: 20 },
      { x: 1120, y: 460, w: 60, h: 20 },
    ],
    collectibles: [
      { x: 140, y: 380 },
      { x: 400, y: 380 },
      { x: 620, y: 320 },
      { x: 820, y: 260 },
      { x: 1020, y: 320 },
      { x: 1260, y: 380 },
    ],
    goal: { x: 1330, y: 360, w: 40, h: 60 },
    checkpoints: [{ x: 760, y: 260 }],
  },
  {
    id: "2",
    name: "Gap Gauntlet",
    width: 1600,
    height: 520,
    spawn: { x: 60, y: 420 },
    platforms: [
      { x: 0, y: 460, w: 200, h: 60 },
      { x: 260, y: 400, w: 100, h: 24 },
      { x: 420, y: 340, w: 100, h: 24 },
      { x: 580, y: 400, w: 100, h: 24 },
      { x: 740, y: 460, w: 160, h: 24 },
      { x: 960, y: 400, w: 90, h: 24 },
      { x: 1110, y: 330, w: 90, h: 24 },
      { x: 1260, y: 400, w: 90, h: 24 },
      { x: 1410, y: 460, w: 190, h: 60 },
    ],
    hazards: [
      { x: 200, y: 500, w: 60, h: 20 },
      { x: 360, y: 500, w: 60, h: 20 },
      { x: 520, y: 500, w: 60, h: 20 },
      { x: 680, y: 500, w: 60, h: 20 },
      { x: 900, y: 500, w: 60, h: 20 },
      { x: 1050, y: 500, w: 60, h: 20 },
      { x: 1200, y: 500, w: 60, h: 20 },
      { x: 1350, y: 500, w: 60, h: 20 },
    ],
    collectibles: [
      { x: 310, y: 360 },
      { x: 470, y: 300 },
      { x: 630, y: 360 },
      { x: 820, y: 420 },
      { x: 1005, y: 360 },
      { x: 1155, y: 290 },
      { x: 1305, y: 360 },
    ],
    goal: { x: 1550, y: 400, w: 40, h: 60 },
    checkpoints: [{ x: 820, y: 420 }],
  },
  {
    id: "3",
    name: "Sky Spire",
    width: 1500,
    height: 700,
    spawn: { x: 60, y: 620 },
    platforms: [
      { x: 0, y: 660, w: 220, h: 40 },
      { x: 260, y: 600, w: 90, h: 20 },
      { x: 260, y: 480, w: 90, h: 20 },
      { x: 260, y: 360, w: 90, h: 20 },
      { x: 460, y: 600, w: 90, h: 20 },
      { x: 620, y: 480, w: 90, h: 20 },
      { x: 460, y: 360, w: 90, h: 20 },
      { x: 620, y: 240, w: 90, h: 20 },
      { x: 460, y: 120, w: 90, h: 20 },
      { x: 780, y: 120, w: 300, h: 24 },
      { x: 1140, y: 200, w: 100, h: 24 },
      { x: 1300, y: 300, w: 200, h: 400 },
    ],
    hazards: [
      { x: 350, y: 660, w: 90, h: 20 },
      { x: 550, y: 660, w: 50, h: 20 },
      { x: 350, y: 540, w: 90, h: 20 },
      { x: 350, y: 300, w: 90, h: 20 },
    ],
    collectibles: [
      { x: 305, y: 560 },
      { x: 305, y: 440 },
      { x: 305, y: 320 },
      { x: 505, y: 560 },
      { x: 665, y: 440 },
      { x: 505, y: 320 },
      { x: 665, y: 200 },
      { x: 505, y: 80 },
      { x: 900, y: 80 },
    ],
    goal: { x: 1350, y: 240, w: 50, h: 60 },
    checkpoints: [{ x: 665, y: 400 }],
    movers: [
      { baseX: 900, baseY: 260, w: 90, h: 20, axis: "y", range: 60, speed: 1.1 },
      { baseX: 1140, baseY: 300, w: 100, h: 20, axis: "x", range: 70, speed: 0.9 },
    ],
  },
];

export function getLevel(id: string): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
