"use client";

import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface CheatEffectsToggles {
  explodeCaptures: boolean;
  confettiOnCheckmate: boolean;
  dramaticZoom: boolean;
  pieceVoiceLines: boolean;
}

/**
 * Pure client-side cosmetic overlay — particle burst on capture, confetti on
 * checkmate, a brief zoom punch on the board, and a silly text bubble on
 * moves. None of this touches game state; it only reacts to sequence
 * counters bumped by the caller when the corresponding event happens.
 */
export function CheatEffects({
  captureSeq,
  checkmateSeq,
  zoomSeq,
  voiceLine,
  toggles,
  zoomTargetRef,
}: {
  captureSeq: number;
  checkmateSeq: number;
  zoomSeq: number;
  voiceLine: { text: string; seq: number } | null;
  toggles: CheatEffectsToggles;
  zoomTargetRef?: React.RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const confettiRef = useRef<Particle[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const prevCapture = useRef(captureSeq);
  const prevCheckmate = useRef(checkmateSeq);
  const prevZoom = useRef(zoomSeq);
  const prevVoiceSeq = useRef(voiceLine?.seq ?? 0);

  useEffect(() => {
    if (toggles.explodeCaptures && captureSeq !== prevCapture.current) {
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16;
        particlesRef.current.push({ x: 50, y: 50, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, life: 1, color: i % 2 ? "#e9a23b" : "#e5604d" });
      }
    }
    prevCapture.current = captureSeq;
  }, [captureSeq, toggles.explodeCaptures]);

  useEffect(() => {
    if (toggles.confettiOnCheckmate && checkmateSeq !== prevCheckmate.current) {
      const colors = ["#e9a23b", "#5bbf7a", "#5aa8e0", "#e5604d", "#b06fe0"];
      for (let i = 0; i < 90; i++) {
        confettiRef.current.push({
          x: Math.random() * 100,
          y: -10,
          vx: (Math.random() - 0.5) * 0.7,
          vy: Math.random() * 1 + 0.6,
          life: 1,
          color: colors[i % colors.length],
        });
      }
    }
    prevCheckmate.current = checkmateSeq;
  }, [checkmateSeq, toggles.confettiOnCheckmate]);

  useEffect(() => {
    if (toggles.dramaticZoom && zoomSeq !== prevZoom.current && zoomTargetRef?.current) {
      const el = zoomTargetRef.current;
      el.style.transition = "transform 150ms ease-out";
      el.style.transform = "scale(1.035)";
      const t = setTimeout(() => {
        el.style.transform = "scale(1)";
      }, 170);
      prevZoom.current = zoomSeq;
      return () => clearTimeout(t);
    }
    prevZoom.current = zoomSeq;
  }, [zoomSeq, toggles.dramaticZoom, zoomTargetRef]);

  useEffect(() => {
    if (toggles.pieceVoiceLines && voiceLine && voiceLine.seq !== prevVoiceSeq.current) {
      setBubble(voiceLine.text);
      prevVoiceSeq.current = voiceLine.seq;
      const t = setTimeout(() => setBubble(null), 1200);
      return () => clearTimeout(t);
    }
    prevVoiceSeq.current = voiceLine?.seq ?? prevVoiceSeq.current;
  }, [voiceLine, toggles.pieceVoiceLines]);

  useEffect(() => {
    let raf: number;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = canvas.width / 100;
        particlesRef.current = particlesRef.current
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.07, life: p.life - 0.025 }))
          .filter((p) => p.life > 0);
        confettiRef.current = confettiRef.current
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.006 }))
          .filter((p) => p.life > 0 && p.y < 110);
        [...particlesRef.current, ...confettiRef.current].forEach((p) => {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x * scale - 3, p.y * scale - 3, 6, 6);
        });
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <canvas data-game-overlay ref={canvasRef} width={600} height={600} className="hidden" aria-hidden="true" />
      {bubble && (
        <div className="animate-pop absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-bold text-black shadow-lg">
          {bubble}
        </div>
      )}
    </div>
  );
}

export const VOICE_LINES = [
  "Onward!",
  "Take that!",
  "Not so fast.",
  "Hmm, interesting.",
  "Charge!",
  "Yoink.",
  "Whoops.",
  "En garde!",
  "Back rank blues.",
  "Tactics!",
];
