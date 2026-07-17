"use client";

import { useEffect, useRef, useState } from "react";
import type { ConfettiParticle, OverlayEffectState } from "@/lib/moderation/useTrollEffects";

const CONFETTI_COLORS = ["#e9a23b", "#5bbf7a", "#5aa8e0", "#e5604d", "#b06fe0"];

/**
 * Renders any troll effect that needs real overlay DOM content (fake
 * banners, bogus arrows, fake lag spinners, confetti, chat/voice bubbles,
 * etc.). Pure CSS board effects (wobble/rainbow/invert/flip/tiny/giant/
 * blackout/lowtime/jitter/flash/shake) don't need this component at all;
 * they're handled entirely by useTrollEffects toggling a class on the board
 * container ref. Never mutates real game state — purely visual, and
 * `pointer-events: none` throughout so it never blocks real play.
 *
 * `watchedBanner` is intentionally a separate prop, not part of `effect` —
 * it's sticky for the rest of the flagged game rather than timed. Confetti
 * is canvas/rAF-driven (mirrors CheatEffects.tsx's particle system) and only
 * runs while particles are alive, so this component isn't constantly
 * animating for every player/spectator on every game.
 */
export function TrollEffectOverlay({
  effect,
  watchedBanner,
  confettiTrigger,
  reduceMotion,
}: {
  effect: OverlayEffectState | null;
  watchedBanner?: boolean;
  confettiTrigger?: number;
  reduceMotion?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const [confettiActive, setConfettiActive] = useState(false);
  const prevConfettiTrigger = useRef(confettiTrigger ?? 0);

  useEffect(() => {
    if (reduceMotion) return; // canvas/rAF isn't touched by the global CSS motion-suppression rule
    if (!confettiTrigger || confettiTrigger === prevConfettiTrigger.current) return;
    prevConfettiTrigger.current = confettiTrigger;
    for (let i = 0; i < 90; i++) {
      particlesRef.current.push({
        x: Math.random() * 100,
        y: -10,
        vx: (Math.random() - 0.5) * 0.7,
        vy: Math.random() * 1 + 0.6,
        life: 1,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      });
    }
    setConfettiActive(true);
  }, [confettiTrigger, reduceMotion]);

  useEffect(() => {
    if (!confettiActive) return;
    let raf: number;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = canvas.width / 100;
        particlesRef.current = particlesRef.current
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.006 }))
          .filter((p) => p.life > 0 && p.y < 110);
        particlesRef.current.forEach((p) => {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x * scale - 3, p.y * scale - 3, 6, 6);
        });
        ctx.globalAlpha = 1;
      }
      if (particlesRef.current.length > 0) {
        raf = requestAnimationFrame(draw);
      } else {
        setConfettiActive(false);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [confettiActive]);

  return (
    <>
      {confettiActive && (
        <canvas data-game-overlay ref={canvasRef} width={300} height={300} className="pointer-events-none absolute inset-0 z-40 h-full w-full" />
      )}
      {watchedBanner && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center">
          <span className="rounded-full border border-purple-400/40 bg-purple-950/90 px-3 py-1 text-xs font-bold text-purple-200 shadow-lg">
            🚩 You&apos;re being watched
          </span>
        </div>
      )}
      {effect?.type === "fakeInCheck" && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center">
          <span className="animate-pop rounded-full border border-red-500/40 bg-red-950/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-200 shadow-lg">
            ⚠ Check!
          </span>
        </div>
      )}
      {effect?.type === "fakeLag" && (
        <div className="pointer-events-none absolute inset-0 z-30 flex animate-fade items-center justify-center bg-black/25">
          <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/80">
            <span className="troll-spinner inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white/90" />
            Reconnecting…
          </div>
        </div>
      )}
      {effect?.type === "emojiBurst" && (
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
      )}
      {effect?.type === "voiceLinePopup" && (
        <div className="animate-pop pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-bold text-black shadow-lg">
          {effect.text}
        </div>
      )}
      {effect?.type === "fakeArrow" && (
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
            x1={effect.arrow.x1}
            y1={effect.arrow.y1}
            x2={effect.arrow.x2}
            y2={effect.arrow.y2}
            stroke="rgba(90,168,224,0.85)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            markerEnd="url(#troll-arrowhead)"
          />
        </svg>
      )}
    </>
  );
}
