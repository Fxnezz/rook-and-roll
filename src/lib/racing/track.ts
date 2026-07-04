import { CatmullRomCurve3, Vector3 } from "three";

/**
 * Original arcade circuit — an oval with a small S-chicane, defined as a
 * closed Catmull-Rom spline through hand-placed control points (not based on
 * any real-world or commercial-game track).
 */
const CONTROL_POINTS: [number, number][] = [
  [0, -80],
  [60, -80],
  [100, -40],
  [100, 20],
  [60, 55],
  [20, 30], // chicane: dip inward
  [-20, 55], // chicane: back out
  [-70, 40],
  [-100, -10],
  [-60, -75],
];

export const TRACK_WIDTH = 16;
export const TOTAL_LAPS = 3;
const SAMPLES = 400;

const curve = new CatmullRomCurve3(
  CONTROL_POINTS.map(([x, z]) => new Vector3(x, 0, z)),
  true, // closed loop
  "catmullrom",
  0.5,
);

// Precompute a dense arc-length-ish sample table for nearest-point projection
// (cheap enough at 400 samples; avoids per-frame curve inversion).
const SAMPLE_POINTS: Vector3[] = Array.from({ length: SAMPLES }, (_, i) => curve.getPointAt(i / SAMPLES));

export function trackPointAt(t: number): Vector3 {
  const wrapped = ((t % 1) + 1) % 1;
  return curve.getPointAt(wrapped);
}

export function trackTangentAt(t: number): Vector3 {
  const wrapped = ((t % 1) + 1) % 1;
  return curve.getTangentAt(wrapped);
}

/** Finds the closest point on the track centerline to `pos`, returning its
 *  parameter t (0..1) and the signed lateral offset (world units; positive =
 *  to the right of the direction of travel). */
export function projectToTrack(pos: Vector3): { t: number; lateral: number; distance: number } {
  let bestI = 0;
  let bestDist = Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    const d = SAMPLE_POINTS[i].distanceToSquared(pos);
    if (d < bestDist) {
      bestDist = d;
      bestI = i;
    }
  }
  const t = bestI / SAMPLES;
  const tangent = trackTangentAt(t);
  const center = SAMPLE_POINTS[bestI];
  const toPos = new Vector3().subVectors(pos, center);
  const right = new Vector3(tangent.z, 0, -tangent.x).normalize();
  const lateral = toPos.dot(right);
  return { t, lateral, distance: Math.sqrt(bestDist) };
}

export function isOnTrack(lateral: number): boolean {
  return Math.abs(lateral) <= TRACK_WIDTH / 2;
}

export function trackOutline(): { center: Vector3[]; left: Vector3[]; right: Vector3[] } {
  const center: Vector3[] = [];
  const left: Vector3[] = [];
  const right: Vector3[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i % SAMPLES) / SAMPLES;
    const p = trackPointAt(t);
    const tangent = trackTangentAt(t);
    const rightDir = new Vector3(tangent.z, 0, -tangent.x).normalize();
    center.push(p);
    left.push(p.clone().addScaledVector(rightDir, -TRACK_WIDTH / 2));
    right.push(p.clone().addScaledVector(rightDir, TRACK_WIDTH / 2));
  }
  return { center, left, right };
}

export const START_POSITION = trackPointAt(0);
export const START_TANGENT = trackTangentAt(0);
