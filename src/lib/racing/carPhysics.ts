/**
 * Arcade-lite car physics — deliberately not a simulation. Velocity is
 * tracked in world space (vx, vz) separately from the car's heading, so
 * heading and the direction of travel can diverge: normal driving has strong
 * lateral grip that keeps them together (the classic "glued to the road"
 * arcade feel), but holding the drift input drops lateral grip and kicks in
 * a small sideways velocity impulse, letting the car slide through a turn
 * with a boosted turn rate — a controllable handbrake drift, not a spin-out.
 * Pure function of (state, input, dt, stats) so it's trivially unit-testable
 * without React or Three.js. `stats` (car type + modifier) is folded in as a
 * multiplier set so different cars/modifiers reuse the exact same model.
 */

export interface CarState {
  x: number;
  z: number;
  heading: number; // radians, 0 = +z axis, facing direction (not necessarily travel direction)
  vx: number; // world-space velocity, units/sec
  vz: number;
  driftFactor: number; // 0..1, how much the car is currently sliding (for FX/scoring)
}

export interface CarInput {
  throttle: number; // -1..1 (brake/reverse .. accelerate)
  steer: number; // -1..1 (left .. right)
  drift: number; // 0 or 1 — handbrake held
}

export interface CarStats {
  maxSpeed: number;
  maxReverse: number;
  accel: number;
  brake: number;
  turnRate: number; // rad/s at low speed
  driftTurnBoost: number; // extra yaw multiplier while drifting
  lateralGrip: number; // 1/s, normal (non-drift) lateral slip decay
  driftGrip: number; // 1/s, lateral slip decay while drifting (lower = looser)
  offTrackGrip: number; // 0..1, fraction of full grip retained off-track (higher = more stable off-road)
}

export const DEFAULT_STATS: CarStats = {
  maxSpeed: 46,
  maxReverse: 14,
  accel: 26,
  brake: 40,
  turnRate: 2.4,
  driftTurnBoost: 1.55,
  lateralGrip: 18,
  driftGrip: 2.2,
  offTrackGrip: 0.45,
};

const FRICTION = 10;
const DRIFT_MIN_SPEED = 8; // can't initiate a drift below this forward speed
const DRIFT_KICK = 0.35; // fraction of forward speed converted to an initial sideways impulse

export function updateCar(
  state: CarState,
  input: CarInput,
  dt: number,
  opts: { onTrack: boolean; stats?: CarStats } = { onTrack: true },
): CarState {
  const stats = opts.stats ?? DEFAULT_STATS;
  const throttle = Math.max(-1, Math.min(1, input.throttle));
  const steer = Math.max(-1, Math.min(1, input.steer));
  const wantsDrift = input.drift > 0.5;
  const grip = opts.onTrack ? 1 : stats.offTrackGrip;

  const fwd = { x: Math.sin(state.heading), z: Math.cos(state.heading) };
  const right = { x: Math.cos(state.heading), z: -Math.sin(state.heading) };

  let fSpeed = state.vx * fwd.x + state.vz * fwd.z;
  let lSpeed = state.vx * right.x + state.vz * right.z;

  // --- forward/reverse throttle ---
  if (throttle > 0) {
    fSpeed += throttle * stats.accel * grip * dt;
  } else if (throttle < 0) {
    fSpeed += throttle * (fSpeed > 0.5 ? stats.brake : stats.accel) * grip * dt;
  } else {
    const decel = FRICTION * dt;
    fSpeed = fSpeed > 0 ? Math.max(0, fSpeed - decel) : Math.min(0, fSpeed + decel);
  }
  fSpeed = Math.max(-stats.maxReverse, Math.min(stats.maxSpeed, fSpeed));

  const isDrifting = wantsDrift && Math.abs(fSpeed) > DRIFT_MIN_SPEED && steer !== 0;

  // A drift impulse only kicks in on the frame(s) it's engaged with active
  // steering; once sliding, lateral speed evolves on its own via grip decay.
  if (isDrifting) {
    lSpeed += steer * fSpeed * DRIFT_KICK * dt * 3;
  }

  // --- steering / heading ---
  const speedFactor = Math.min(1, Math.abs(fSpeed) / stats.maxSpeed);
  const baseTurnRate = stats.turnRate * (1 - 0.55 * speedFactor) * grip;
  const turnRate = isDrifting ? baseTurnRate * stats.driftTurnBoost : baseTurnRate;
  const direction = fSpeed >= 0 ? 1 : -1;
  const heading = state.heading + steer * turnRate * direction * dt;

  // --- lateral grip: strong when driving normally, loose while drifting ---
  const lateralGrip = (isDrifting ? stats.driftGrip : stats.lateralGrip) * grip;
  lSpeed *= Math.max(0, 1 - lateralGrip * dt);

  const newFwd = { x: Math.sin(heading), z: Math.cos(heading) };
  const newRight = { x: Math.cos(heading), z: -Math.sin(heading) };
  const vx = newFwd.x * fSpeed + newRight.x * lSpeed;
  const vz = newFwd.z * fSpeed + newRight.z * lSpeed;

  const x = state.x + vx * dt;
  const z = state.z + vz * dt;
  const driftFactor = Math.max(0, Math.min(1, Math.abs(lSpeed) / (stats.maxSpeed * 0.5)));

  return { x, z, heading, vx, vz, driftFactor };
}

export function initialCarState(x: number, z: number, heading: number): CarState {
  return { x, z, heading, vx: 0, vz: 0, driftFactor: 0 };
}

/** Current speed magnitude (world units/sec), for HUD display. */
export function carSpeed(state: CarState): number {
  return Math.hypot(state.vx, state.vz);
}
