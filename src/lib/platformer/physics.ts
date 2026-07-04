/**
 * Original 2D platformer physics — axis-separated AABB collision (resolve X,
 * then Y), gravity, run + double-jump. Pure and dependency-free so it's
 * unit-testable without canvas/React.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  jumpsUsed: number;
  facing: 1 | -1;
  w: number;
  h: number;
}

export interface PlatformerInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean; // edge-triggered: true only on the frame the key was pressed
}

const GRAVITY = 1400;
const MOVE_ACCEL = 2600;
const MAX_RUN_SPEED = 260;
const AIR_CONTROL = 0.75;
const GROUND_FRICTION = 2200;
const JUMP_VELOCITY = 560;
const MAX_FALL_SPEED = 900;
const MAX_JUMPS = 2; // double-jump

export function playerRect(p: PlayerState): Rect {
  return { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createPlayer(x: number, y: number): PlayerState {
  return { x, y, vx: 0, vy: 0, onGround: false, jumpsUsed: 0, facing: 1, w: 28, h: 40 };
}

/** Advance the player one physics step against a set of solid platforms. */
export function stepPlayer(p: PlayerState, input: PlatformerInput, dt: number, platforms: Rect[]): PlayerState {
  const next: PlayerState = { ...p };

  // --- horizontal ---
  const accel = next.onGround ? MOVE_ACCEL : MOVE_ACCEL * AIR_CONTROL;
  if (input.left && !input.right) {
    next.vx -= accel * dt;
    next.facing = -1;
  } else if (input.right && !input.left) {
    next.vx += accel * dt;
    next.facing = 1;
  } else if (next.onGround) {
    const friction = GROUND_FRICTION * dt;
    if (next.vx > 0) next.vx = Math.max(0, next.vx - friction);
    else if (next.vx < 0) next.vx = Math.min(0, next.vx + friction);
  }
  next.vx = Math.max(-MAX_RUN_SPEED, Math.min(MAX_RUN_SPEED, next.vx));

  // --- jump (edge-triggered so holding the key doesn't spam jumps) ---
  if (input.jumpPressed && next.jumpsUsed < MAX_JUMPS) {
    next.vy = -JUMP_VELOCITY;
    next.jumpsUsed += 1;
    next.onGround = false;
  }

  // --- gravity ---
  next.vy = Math.min(MAX_FALL_SPEED, next.vy + GRAVITY * dt);

  // --- resolve X ---
  next.x += next.vx * dt;
  for (const plat of platforms) {
    const r = playerRect(next);
    if (rectsOverlap(r, plat)) {
      if (next.vx > 0) next.x = plat.x - next.w / 2;
      else if (next.vx < 0) next.x = plat.x + plat.w + next.w / 2;
      next.vx = 0;
    }
  }

  // --- resolve Y ---
  next.y += next.vy * dt;
  let grounded = false;
  for (const plat of platforms) {
    const r = playerRect(next);
    if (rectsOverlap(r, plat)) {
      if (next.vy > 0) {
        // falling onto the platform's top
        next.y = plat.y;
        next.vy = 0;
        grounded = true;
        next.jumpsUsed = 0;
      } else if (next.vy < 0) {
        // hit the platform's underside
        next.y = plat.y + plat.h + next.h;
        next.vy = 0;
      }
    }
  }
  next.onGround = grounded;

  return next;
}

export function circleRectOverlap(cx: number, cy: number, r: number, rect: Rect): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}
