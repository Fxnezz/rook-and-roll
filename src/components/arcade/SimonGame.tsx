"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const PADS = [
  { id: 0, color: "#e5604d", freq: 329.63 }, // E4
  { id: 1, color: "#5bbf7a", freq: 392.0 }, // G4
  { id: 2, color: "#5aa8e0", freq: 261.63 }, // C4
  { id: 3, color: "#e9c73f", freq: 440.0 }, // A4
];

let audioCtx: AudioContext | null = null;
function playTone(freq: number, dur = 0.3) {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur + 0.02);
}

export function SimonGame() {
  const { best, submit } = useHighScore("simon", { higherIsBetter: true });
  const [sequence, setSequence] = useState<number[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "playback" | "input" | "over">("idle");
  const [inputCount, setInputCount] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const playback = useCallback((seq: number[]) => {
    setPhase("playback");
    setInputCount(0);
    clearTimers();
    seq.forEach((padId, i) => {
      const t1 = window.setTimeout(() => {
        setPlayingIdx(padId);
        playTone(PADS[padId].freq);
      }, i * 650);
      const t2 = window.setTimeout(() => setPlayingIdx(null), i * 650 + 400);
      timers.current.push(t1, t2);
    });
    const tEnd = window.setTimeout(() => setPhase("input"), seq.length * 650 + 200);
    timers.current.push(tEnd);
  }, []);

  const start = () => {
    const first = [Math.floor(Math.random() * 4)];
    setSequence(first);
    playback(first);
  };

  const handlePad = (padId: number) => {
    if (phase !== "input") return;
    playTone(PADS[padId].freq, 0.18);
    setPlayingIdx(padId);
    setTimeout(() => setPlayingIdx(null), 150);

    if (sequence[inputCount] !== padId) {
      setPhase("over");
      playArcadeSound("wrong");
      submit(sequence.length - 1);
      return;
    }
    const nextCount = inputCount + 1;
    if (nextCount === sequence.length) {
      playArcadeSound("correct");
      const next = [...sequence, Math.floor(Math.random() * 4)];
      setTimeout(() => {
        setSequence(next);
        playback(next);
      }, 500);
    } else {
      setInputCount(nextCount);
    }
  };

  const reset = () => {
    clearTimers();
    setSequence([]);
    setPhase("idle");
    setInputCount(0);
    setPlayingIdx(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="chip">Round: {sequence.length}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <div className="relative grid grid-cols-2 gap-3" style={{ width: 280, height: 280 }}>
        {PADS.map((pad) => (
          <button
            key={pad.id}
            onClick={() => handlePad(pad.id)}
            disabled={phase !== "input"}
            className="rounded-2xl transition-opacity"
            style={{
              background: pad.color,
              opacity: playingIdx === pad.id ? 1 : 0.55,
              boxShadow: playingIdx === pad.id ? `0 0 24px 4px ${pad.color}` : "none",
            }}
          />
        ))}
        {(phase === "idle" || phase === "over") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70">
            {phase === "over" && <p className="text-lg font-bold text-white">Round {sequence.length} — game over</p>}
            <button className="btn btn-primary" onClick={start}>
              {phase === "over" ? "Try again" : "Start"}
            </button>
          </div>
        )}
      </div>
      <button className="btn btn-ghost !py-1 text-xs" onClick={reset}>
        Reset
      </button>
      <p className="text-xs text-[var(--text-faint)]">Watch the sequence, then repeat it. Each round adds one more step.</p>
    </div>
  );
}
