/**
 * Pure lane/obstacle math for Frogger, kept separate from the canvas
 * component so the tricky wraparound position logic can be unit tested.
 */
export const COLS = 13;
export const ROWS = 14;
export const CELL = 30;
export const WIDTH = COLS * CELL;
export const HEIGHT = ROWS * CELL;

export type LaneType = "goal" | "safe" | "road" | "river" | "start";

export interface Lane {
  row: number;
  type: LaneType;
  speed: number;
  dir: 1 | -1;
  obstacleW: number;
  gap: number;
}

export const LANES: Lane[] = [
  { row: 0, type: "goal", speed: 0, dir: 1, obstacleW: 0, gap: 0 },
  { row: 1, type: "river", speed: 1.2, dir: 1, obstacleW: 70, gap: 60 },
  { row: 2, type: "river", speed: 0.8, dir: -1, obstacleW: 50, gap: 50 },
  { row: 3, type: "river", speed: 1.6, dir: 1, obstacleW: 90, gap: 70 },
  { row: 4, type: "river", speed: 1.0, dir: -1, obstacleW: 60, gap: 55 },
  { row: 5, type: "river", speed: 1.4, dir: 1, obstacleW: 55, gap: 65 },
  { row: 6, type: "safe", speed: 0, dir: 1, obstacleW: 0, gap: 0 },
  { row: 7, type: "road", speed: 1.5, dir: -1, obstacleW: 34, gap: 60 },
  { row: 8, type: "road", speed: 1.0, dir: 1, obstacleW: 30, gap: 80 },
  { row: 9, type: "road", speed: 2.0, dir: -1, obstacleW: 34, gap: 70 },
  { row: 10, type: "road", speed: 1.2, dir: 1, obstacleW: 30, gap: 90 },
  { row: 11, type: "road", speed: 1.8, dir: -1, obstacleW: 34, gap: 65 },
  { row: 12, type: "safe", speed: 0, dir: 1, obstacleW: 0, gap: 0 },
  { row: 13, type: "start", speed: 0, dir: 1, obstacleW: 0, gap: 0 },
];

export function laneObstacles(lane: Lane, frame: number, speedMultiplier = 1): { x: number; width: number }[] {
  if (lane.obstacleW === 0) return [];
  const period = lane.obstacleW + lane.gap;
  const totalW = WIDTH + period;
  const count = Math.ceil(totalW / period) + 1;
  const out: { x: number; width: number }[] = [];
  for (let i = 0; i < count; i++) {
    let x = (i * period + frame * lane.speed * speedMultiplier * lane.dir) % totalW;
    if (x < 0) x += totalW;
    x -= period;
    out.push({ x, width: lane.obstacleW });
  }
  return out;
}

export function overlaps(x1: number, w1: number, x2: number, w2: number): boolean {
  return x1 < x2 + w2 && x2 < x1 + w1;
}

export function laneAt(row: number): Lane {
  return LANES[row];
}
