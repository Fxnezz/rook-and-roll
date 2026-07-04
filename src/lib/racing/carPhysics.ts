/**
 * Arcade-lite car physics — deliberately not a simulation. Forward/reverse
 * acceleration, speed-scaled steering (so low-speed turns are tighter, like
 * classic arcade racers), a drift factor that lets heading and velocity
 * diverge slightly under hard steering at speed, and an off-track penalty.
 * Pure function of (state, input, dt) so it's trivially unit-testable
 * without React or Three.js.
 */

export interface CarState {
  x: number;
  z: number;
  heading: number; // radians, 0 = +z axis
  speed: number; // world units / second, signed (negative = reverse)
}

export interface CarInput {
  throttle: number; // -1..1 (brake/reverse .. accelerate)
  steer: number; // -1..1 (left .. right)
}

const MAX_SPEED = 46;
const MAX_REVERSE = 14;
const ACCEL = 26;
const BRAKE = 40;
const FRICTION = 10;
const MAX_TURN_RATE = 2.4; // rad/s at low speed
const OFF_TRACK_GRIP = 0.45;

export function updateCar(
  state: CarState,
  input: CarInput,
  dt: number,
  opts: { onTrack: boolean } = { onTrack: true },
): CarState {
  const throttle = Math.max(-1, Math.min(1, input.throttle));
  const steer = Math.max(-1, Math.min(1, input.steer));
  const grip = opts.onTrack ? 1 : OFF_TRACK_GRIP;

  let speed = state.speed;
  if (throttle > 0) {
    speed += throttle * ACCEL * grip * dt;
  } else if (throttle < 0) {
    // braking is stronger while moving forward, weaker (reverse accel) at rest
    speed += throttle * (speed > 0.5 ? BRAKE : ACCEL) * grip * dt;
  } else {
    // engine/rolling friction toward zero
    const decel = FRICTION * dt;
    speed = speed > 0 ? Math.max(0, speed - decel) : Math.min(0, speed + decel);
  }
  speed = Math.max(-MAX_REVERSE, Math.min(MAX_SPEED, speed));

  // Steering authority scales down at high speed (arcade feel: nimble at low
  // speed, more stable at top speed) and reverses sense in reverse gear.
  const speedFactor = Math.min(1, Math.abs(speed) / MAX_SPEED);
  const turnRate = MAX_TURN_RATE * (1 - 0.55 * speedFactor) * grip;
  const direction = speed >= 0 ? 1 : -1;
  const heading = state.heading + steer * turnRate * direction * dt;

  const dx = Math.sin(heading) * speed * dt;
  const dz = Math.cos(heading) * speed * dt;

  return { x: state.x + dx, z: state.z + dz, heading, speed };
}

export function initialCarState(x: number, z: number, heading: number): CarState {
  return { x, z, heading, speed: 0 };
}
