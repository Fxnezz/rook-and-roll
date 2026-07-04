import { DEFAULT_STATS, type CarStats } from "./carPhysics";

export type CarVariant = "sedan" | "sport" | "truck";

export interface CarType {
  id: string;
  name: string;
  blurb: string;
  color: string;
  scale: number; // visual size multiplier
  variant: CarVariant;
  stats: CarStats;
}

export const CAR_TYPES: CarType[] = [
  {
    id: "balanced",
    name: "Balanced",
    blurb: "Even handling all around — a great default.",
    color: "#e9a23b",
    scale: 1,
    variant: "sedan",
    stats: { ...DEFAULT_STATS },
  },
  {
    id: "speedster",
    name: "Speedster",
    blurb: "High top speed and quick acceleration, but looser grip at the limit.",
    color: "#5aa8e0",
    scale: 0.93,
    variant: "sport",
    stats: { ...DEFAULT_STATS, maxSpeed: 57, accel: 31, lateralGrip: 15, driftGrip: 1.8, offTrackGrip: 0.35 },
  },
  {
    id: "drifter",
    name: "Drifter",
    blurb: "Built to slide — a huge drift turn boost and a looser rear end.",
    color: "#b06fe0",
    scale: 0.95,
    variant: "sport",
    stats: { ...DEFAULT_STATS, maxSpeed: 42, turnRate: 2.7, driftTurnBoost: 2.15, driftGrip: 1.35 },
  },
  {
    id: "truck",
    name: "Trail Truck",
    blurb: "Heavy and slower, but stays composed off the track.",
    color: "#5bbf7a",
    scale: 1.2,
    variant: "truck",
    stats: { ...DEFAULT_STATS, maxSpeed: 37, accel: 18, brake: 46, lateralGrip: 24, turnRate: 2.0, offTrackGrip: 0.75 },
  },
];

export function getCarType(id: string): CarType {
  return CAR_TYPES.find((c) => c.id === id) ?? CAR_TYPES[0];
}

export interface Modifier {
  id: string;
  name: string;
  blurb: string;
  apply: (stats: CarStats) => CarStats;
}

export const MODIFIERS: Modifier[] = [
  {
    id: "none",
    name: "Standard",
    blurb: "No modifier — stock handling.",
    apply: (s) => s,
  },
  {
    id: "icy",
    name: "Icy Track",
    blurb: "Grip is cut everywhere — every turn wants to slide.",
    apply: (s) => ({ ...s, lateralGrip: s.lateralGrip * 0.35, driftGrip: s.driftGrip * 0.55, offTrackGrip: s.offTrackGrip * 0.6 }),
  },
  {
    id: "turbo",
    name: "Turbo Boost",
    blurb: "Higher top speed and much stronger acceleration.",
    apply: (s) => ({ ...s, maxSpeed: s.maxSpeed * 1.3, accel: s.accel * 1.35 }),
  },
  {
    id: "nimble",
    name: "Nimble",
    blurb: "Sharper steering and drift response, at the cost of top speed.",
    apply: (s) => ({ ...s, turnRate: s.turnRate * 1.35, driftTurnBoost: s.driftTurnBoost * 1.2, maxSpeed: s.maxSpeed * 0.85 }),
  },
];

export function getModifier(id: string): Modifier {
  return MODIFIERS.find((m) => m.id === id) ?? MODIFIERS[0];
}
