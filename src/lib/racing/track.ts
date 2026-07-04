import { CatmullRomCurve3, Vector3 } from "three";

/**
 * Original arcade circuits, each an original closed Catmull-Rom spline
 * (not based on any real-world or commercial-game track). "Chicane Circuit"
 * is hand-placed; the others are generated from a wobbling-radius oval so
 * they're guaranteed simple (non-self-intersecting) closed loops, which the
 * nearest-sample-point projection below depends on.
 */
export interface TrackDef {
  id: string;
  name: string;
  blurb: string;
  controlPoints: [number, number][];
  width: number;
  laps: number;
}

function ovalPoints(n: number, rx: number, rz: number, wobble: (theta: number) => number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const theta = (i / n) * Math.PI * 2;
    const r = 1 + wobble(theta);
    pts.push([Math.sin(theta) * rx * r, -Math.cos(theta) * rz * r]);
  }
  return pts;
}

export const TRACK_DEFS: TrackDef[] = [
  {
    id: "chicane",
    name: "Chicane Circuit",
    blurb: "A tight technical loop with an S-chicane — the original Circuit Dash track.",
    controlPoints: [
      [0, -80], [60, -80], [100, -40], [100, 20], [60, 55],
      [20, 30], [-20, 55], [-70, 40], [-100, -10], [-60, -75],
    ],
    width: 16,
    laps: 3,
  },
  {
    id: "oval",
    name: "Oval Sprint",
    blurb: "A wide, fast oval — few sharp turns, built for top speed.",
    controlPoints: ovalPoints(8, 100, 85, () => 0),
    width: 20,
    laps: 4,
  },
  {
    id: "switchback",
    name: "Switchback Pass",
    blurb: "Three sweeping lobes with tight hairpins — a real test for drifting.",
    controlPoints: ovalPoints(12, 95, 95, (t) => 0.35 * Math.sin(t * 3)),
    width: 14,
    laps: 3,
  },
  {
    id: "coastal",
    name: "Coastal Loop",
    blurb: "A long, wavy loop with gentle elevation-style curves and a big back straight.",
    controlPoints: ovalPoints(10, 125, 70, (t) => 0.2 * Math.sin(t * 2 + 1)),
    width: 17,
    laps: 3,
  },
];

const SAMPLES = 400;

export interface Track {
  id: string;
  name: string;
  blurb: string;
  width: number;
  laps: number;
  trackPointAt(t: number): Vector3;
  trackTangentAt(t: number): Vector3;
  projectToTrack(pos: Vector3): { t: number; lateral: number; distance: number };
  isOnTrack(lateral: number): boolean;
  trackOutline(): { center: Vector3[]; left: Vector3[]; right: Vector3[] };
  startPosition: Vector3;
  startTangent: Vector3;
}

function buildTrack(def: TrackDef): Track {
  const curve = new CatmullRomCurve3(
    def.controlPoints.map(([x, z]) => new Vector3(x, 0, z)),
    true,
    "catmullrom",
    0.5,
  );
  const samplePoints: Vector3[] = Array.from({ length: SAMPLES }, (_, i) => curve.getPointAt(i / SAMPLES));

  function trackPointAt(t: number): Vector3 {
    return curve.getPointAt(((t % 1) + 1) % 1);
  }
  function trackTangentAt(t: number): Vector3 {
    return curve.getTangentAt(((t % 1) + 1) % 1);
  }
  function projectToTrack(pos: Vector3): { t: number; lateral: number; distance: number } {
    let bestI = 0;
    let bestDist = Infinity;
    for (let i = 0; i < SAMPLES; i++) {
      const d = samplePoints[i].distanceToSquared(pos);
      if (d < bestDist) {
        bestDist = d;
        bestI = i;
      }
    }
    const t = bestI / SAMPLES;
    const tangent = trackTangentAt(t);
    const center = samplePoints[bestI];
    const toPos = new Vector3().subVectors(pos, center);
    const right = new Vector3(tangent.z, 0, -tangent.x).normalize();
    const lateral = toPos.dot(right);
    return { t, lateral, distance: Math.sqrt(bestDist) };
  }
  function isOnTrack(lateral: number): boolean {
    return Math.abs(lateral) <= def.width / 2;
  }
  function trackOutline() {
    const center: Vector3[] = [];
    const left: Vector3[] = [];
    const right: Vector3[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i % SAMPLES) / SAMPLES;
      const p = trackPointAt(t);
      const tangent = trackTangentAt(t);
      const rightDir = new Vector3(tangent.z, 0, -tangent.x).normalize();
      center.push(p);
      left.push(p.clone().addScaledVector(rightDir, -def.width / 2));
      right.push(p.clone().addScaledVector(rightDir, def.width / 2));
    }
    return { center, left, right };
  }

  return {
    id: def.id,
    name: def.name,
    blurb: def.blurb,
    width: def.width,
    laps: def.laps,
    trackPointAt,
    trackTangentAt,
    projectToTrack,
    isOnTrack,
    trackOutline,
    startPosition: trackPointAt(0),
    startTangent: trackTangentAt(0),
  };
}

const trackCache = new Map<string, Track>();

export function getTrack(id: string): Track {
  const cached = trackCache.get(id);
  if (cached) return cached;
  const def = TRACK_DEFS.find((d) => d.id === id) ?? TRACK_DEFS[0];
  const track = buildTrack(def);
  trackCache.set(def.id, track);
  return track;
}
