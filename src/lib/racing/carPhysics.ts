/**
 * Arcade-lite car physics — deliberately not a simulation. Velocity is
 * tracked in world space (vx, vz) separately from the car's heading, so
 * heading and the direction of travel can diverge: normal driving has strong
 * lateral grip that keeps them together (the classic "glued to the road"
 * arcade feel), but holding the drift input drops lateral grip and kicks in
 * a small sideways velocity impulse, letting the car slide through a turn
 * with a boosted turn rate — a controllable handbrake drift, not a spin-out.
 * Pure function of (state, input, dt) so it's trivially unit-testable
 * without React or Three.js.
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

const MAX_SPEED = 46;
const MAX_REVERSE = 14;
const ACCEL = 26;
const BRAKE = 40;
const FRICTION = 10;
const MAX_TURN_RATE = 2.4; // rad/s at low speed
const DRIFT_TURN_BOOST = 1.55; // extra yaw rate while drifting
const OFF_TRACK_GRIP = 0.45;
const DRIFT_MIN_SPEED = 8; // can't initiate a drift below this forward speed
const NORMAL_LATERAL_GRIP = 18; // 1/s — how fast lateral slip is killed when not drifting
const DRIFT_LATERAL_GRIP = 2.2; // much looser while drifting
const DRIFT_KICK = 0.35; // fraction of forward speed converted to an initial sideways impulse

export function updateCar(
  state: CarState,
  input: CarInput,
  dt: number,
  opts: { onTrack: boolean } = { onTrack: true },
): CarState {
  const throttle = Math.max(-1, Math.min(1, input.throttle));
  const steer = Math.max(-1, Math.min(1, input.steer));
  const wantsDrift = input.drift > 0.5;
  const grip = opts.onTrack ? 1 : OFF_TRACK_GRIP;

  const fwd = { x: Math.sin(state.heading), z: Math.cos(state.heading) };
  const right = { x: Math.cos(state.heading), z: -Math.sin(state.heading) };

  let fSpeed = state.vx * fwd.x + state.vz * fwd.z;
  let lSpeed = state.vx * right.x + state.vz * right.z;

  // --- forward/reverse throttle ---
  if (throttle > 0) {
    fSpeed += throttle * ACCEL * grip * dt;
  } else if (throttle < 0) {
    fSpeed += throttle * (fSpeed > 0.5 ? BRAKE : ACCEL) * grip * dt;
  } else {
    const decel = FRICTION * dt;
    fSpeed = fSpeed > 0 ? Math.max(0, fSpeed - decel) : Math.min(0, fSpeed + decel);
  }
  fSpeed = Math.max(-MAX_REVERSE, Math.min(MAX_SPEED, fSpeed));

  const isDrifting = wantsDrift && Math.abs(fSpeed) > DRIFT_MIN_SPEED && steer !== 0;

  // A drift impulse only kicks in on the frame(s) it's engaged with active
  // steering; once sliding, lateral speed evolves on its own via grip decay.
  if (isDrifting) {
    lSpeed += steer * fSpeed * DRIFT_KICK * dt * 3;
  }

  // --- steering / heading ---
  const speedFactor = Math.min(1, Math.abs(fSpeed) / MAX_SPEED);
  const baseTurnRate = MAX_TURN_RATE * (1 - 0.55 * speedFactor) * grip;
  const turnRate = isDrifting ? baseTurnRate * DRIFT_TURN_BOOST : baseTurnRate;
  const direction = fSpeed >= 0 ? 1 : -1;
  const heading = state.heading + steer * turnRate * direction * dt;

  // --- lateral grip: strong when driving normally, loose while drifting ---
  const lateralGrip = (isDrifting ? DRIFT_LATERAL_GRIP : NORMAL_LATERAL_GRIP) * grip;
  lSpeed *= Math.max(0, 1 - lateralGrip * dt);

  const newFwd = { x: Math.sin(heading), z: Math.cos(heading) };
  const newRight = { x: Math.cos(heading), z: -Math.sin(heading) };
  const vx = newFwd.x * fSpeed + newRight.x * lSpeed;
  const vz = newFwd.z * fSpeed + newRight.z * lSpeed;

  const x = state.x + vx * dt;
  const z = state.z + vz * dt;
  const driftFactor = Math.max(0, Math.min(1, Math.abs(lSpeed) / (MAX_SPEED * 0.5)));

  return { x, z, heading, vx, vz, driftFactor };
}

export function initialCarState(x: number, z: number, heading: number): CarState {
  return { x, z, heading, vx: 0, vz: 0, driftFactor: 0 };
}

/** Current speed magnitude (world units/sec), for HUD display. */
export function carSpeed(state: CarState): number {
  return Math.hypot(state.vx, state.vz);
}
