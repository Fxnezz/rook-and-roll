"use client";

/**
 * Renders any troll effect that needs real overlay DOM content (fake
 * banners, clock overlays, confetti, chat/voice bubbles, etc.) — filled in
 * batch by batch. Pure CSS board effects (wobble/rainbow/invert/flip/tiny/
 * giant/blackout) don't need this component at all; they're handled
 * entirely by useTrollEffects toggling a class on the board container ref.
 */
export function TrollEffectOverlay() {
  return null;
}
