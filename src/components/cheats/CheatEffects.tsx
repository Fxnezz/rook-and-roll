"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

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
  const [bubble, setBubble] = useState<string | null>(null);
  const [captureBurst, setCaptureBurst] = useState<number | null>(null);
  const [confettiBurst, setConfettiBurst] = useState<number | null>(null);
  const prevCapture = useRef(captureSeq);
  const prevCheckmate = useRef(checkmateSeq);
  const prevZoom = useRef(zoomSeq);
  const prevVoiceSeq = useRef(voiceLine?.seq ?? 0);

  useEffect(() => {
    if (toggles.explodeCaptures && captureSeq !== prevCapture.current) {
      setCaptureBurst(captureSeq);
      const timer = window.setTimeout(() => setCaptureBurst(null), 850);
      prevCapture.current = captureSeq;
      return () => window.clearTimeout(timer);
    }
    prevCapture.current = captureSeq;
  }, [captureSeq, toggles.explodeCaptures]);

  useEffect(() => {
    if (toggles.confettiOnCheckmate && checkmateSeq !== prevCheckmate.current) {
      setConfettiBurst(checkmateSeq);
      const timer = window.setTimeout(() => setConfettiBurst(null), 1800);
      prevCheckmate.current = checkmateSeq;
      return () => window.clearTimeout(timer);
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

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {captureBurst !== null && (
        <div key={`capture-${captureBurst}`} className="cheat-capture-burst absolute inset-0" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 18;
            return <i key={index} style={{ "--x": `${Math.cos(angle) * 120}px`, "--y": `${Math.sin(angle) * 120}px`, "--spin": `${index * 47}deg`, "--spark": index % 2 ? "#f4b451" : "#ee6b5d" } as CSSProperties} />;
          })}
        </div>
      )}
      {confettiBurst !== null && (
        <div key={`mate-${confettiBurst}`} className="cheat-confetti-burst absolute inset-0" aria-hidden="true">
          {Array.from({ length: 48 }, (_, index) => <i key={index} style={{ "--left": `${(index * 37) % 101}%`, "--delay": `${(index % 12) * 34}ms`, "--drift": `${((index * 19) % 90) - 45}px`, "--spin": `${180 + (index % 7) * 70}deg`, "--confetti": ["#f4b451", "#5bbf7a", "#5aa8e0", "#e5604d", "#b06fe0"][index % 5] } as CSSProperties} />)}
        </div>
      )}
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
