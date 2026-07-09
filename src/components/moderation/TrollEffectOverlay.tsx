"use client";

import type { OverlayEffectState } from "@/lib/moderation/useTrollEffects";

/**
 * Renders any troll effect that needs real overlay DOM content (fake
 * banners, bogus arrows, fake lag spinners, confetti, chat/voice bubbles,
 * etc.) — filled in batch by batch. Pure CSS board effects (wobble/rainbow/
 * invert/flip/tiny/giant/blackout/lowtime/jitter) don't need this component
 * at all; they're handled entirely by useTrollEffects toggling a class on
 * the board container ref. Never mutates real game state — purely visual,
 * and `pointer-events: none` throughout so it never blocks real play.
 */
export function TrollEffectOverlay({ effect }: { effect: OverlayEffectState | null }) {
  if (!effect) return null;

  if (effect.type === "fakeInCheck") {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center">
        <span className="animate-pop rounded-full border border-red-500/40 bg-red-950/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-200 shadow-lg">
          ⚠ Check!
        </span>
      </div>
    );
  }

  if (effect.type === "fakeLag") {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 flex animate-fade items-center justify-center bg-black/25">
        <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/80">
          <span className="troll-spinner inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white/90" />
          Reconnecting…
        </div>
      </div>
    );
  }

  if (effect.type === "emojiBurst") {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        {effect.particles.map((p, i) => (
          <span
            key={i}
            className="troll-emoji-rise absolute bottom-2 text-2xl"
            style={{ left: `${p.leftPct}%`, animationDelay: `${p.delayMs}ms` }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
    );
  }

  if (effect.type === "fakeArrow") {
    const { x1, y1, x2, y2 } = effect.arrow;
    return (
      <svg
        className="pointer-events-none absolute inset-0 z-30 h-full w-full animate-fade"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <marker id="troll-arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="rgba(90,168,224,0.85)" />
          </marker>
        </defs>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(90,168,224,0.85)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          markerEnd="url(#troll-arrowhead)"
        />
      </svg>
    );
  }

  return null;
}
