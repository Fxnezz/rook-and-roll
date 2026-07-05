"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const HOLES = 9;
const GAME_SECONDS = 30;

export function WhackAMoleGame() {
  const { best, submit } = useHighScore("whackamole", { higherIsBetter: true });
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [hitHole, setHitHole] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const activeRef = useRef<number | null>(null);
  const hitRef = useRef(false);
  const spawnTimeout = useRef<number | null>(null);
  const hideTimeout = useRef<number | null>(null);
  const countdownInterval = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const clearTimers = () => {
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  };
  useEffect(() => clearTimers, []);

  const spawnMole = useCallback(() => {
    const elapsedFrac = Math.min(1, (Date.now() - startRef.current) / (GAME_SECONDS * 1000));
    const upDuration = Math.max(450, 1100 - elapsedFrac * 700);
    const gap = Math.max(250, 700 - elapsedFrac * 400);

    let hole = Math.floor(Math.random() * HOLES);
    if (hole === activeRef.current) hole = (hole + 1) % HOLES;
    activeRef.current = hole;
    hitRef.current = false;
    setActiveHole(hole);

    hideTimeout.current = window.setTimeout(() => {
      if (!hitRef.current && activeRef.current === hole) {
        comboRef.current = 0;
        setCombo(0);
      }
      activeRef.current = null;
      setActiveHole(null);
      spawnTimeout.current = window.setTimeout(spawnMole, gap);
    }, upDuration);
  }, []);

  const start = useCallback(() => {
    clearTimers();
    scoreRef.current = 0;
    comboRef.current = 0;
    activeRef.current = null;
    setScore(0);
    setCombo(0);
    setActiveHole(null);
    setOver(false);
    setTimeLeft(GAME_SECONDS);
    startRef.current = Date.now();
    setRunning(true);
    spawnMole();
    countdownInterval.current = window.setInterval(() => {
      const left = GAME_SECONDS - Math.floor((Date.now() - startRef.current) / 1000);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearTimers();
        setRunning(false);
        setOver(true);
        setActiveHole(null);
        playArcadeSound("gameOver");
        submit(scoreRef.current);
      }
    }, 200);
  }, [spawnMole, submit]);

  const whack = (hole: number) => {
    if (!running || activeRef.current !== hole || hitRef.current) return;
    hitRef.current = true;
    comboRef.current += 1;
    setCombo(comboRef.current);
    const points = 10 + Math.min(40, (comboRef.current - 1) * 5);
    scoreRef.current += points;
    setScore(scoreRef.current);
    setHitHole(hole);
    setTimeout(() => setHitHole(null), 150);
    playArcadeSound("eat");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        <span className="chip">Combo: x{combo}</span>
        <span className="chip">⏱ {timeLeft}s</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <div className="relative grid grid-cols-3 gap-3" style={{ width: 300, height: 300 }}>
        {Array.from({ length: HOLES }).map((_, i) => {
          const up = activeHole === i;
          const hit = hitHole === i;
          return (
            <button
              key={i}
              onClick={() => whack(i)}
              className="relative flex items-end justify-center overflow-hidden rounded-full"
              style={{ background: "radial-gradient(circle at 50% 30%, #3a2818, #1c1208)" }}
            >
              <span
                className="mb-0 flex h-[70%] w-[70%] items-center justify-center rounded-t-full text-3xl transition-transform duration-150"
                style={{
                  background: hit ? "#e9a23b" : "#8a5a3a",
                  transform: up ? "translateY(10%)" : "translateY(100%)",
                }}
              >
                {up ? (hit ? "💥" : "🐹") : ""}
              </span>
            </button>
          );
        })}
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70">
            {over && <p className="text-lg font-bold text-white">Time's up — {score} points!</p>}
            <button className="btn btn-primary" onClick={start}>
              {over ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">30 seconds. Chain hits without missing to build your combo multiplier.</p>
    </div>
  );
}
