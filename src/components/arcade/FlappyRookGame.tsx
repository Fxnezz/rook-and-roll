"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const WIDTH = 360;
const HEIGHT = 480;
const ROOK_X = 90;
const ROOK_R = 14;
const GRAVITY = 0.35;
const FLAP_VELOCITY = -6.2;
const PIPE_W = 56;
const GAP_H = 130;
const PIPE_SPEED_START = 2.4;

interface Pipe {
  x: number;
  gapY: number; // center of the gap
  passed: boolean;
}

export function FlappyRookGame() {
  const { best, submit } = useHighScore("flappyrook", { higherIsBetter: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const rookY = useRef(HEIGHT / 2);
  const velocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frame = useRef(0);
  const scoreRef = useRef(0);
  const speedRef = useRef(PIPE_SPEED_START);
  const launchedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [over, setOver] = useState(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#141821";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // pipes
    ctx.fillStyle = "#5bbf7a";
    for (const p of pipes.current) {
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY - GAP_H / 2);
      ctx.fillRect(p.x, p.gapY + GAP_H / 2, PIPE_W, HEIGHT - (p.gapY + GAP_H / 2));
    }

    // rook (simple chess-rook silhouette)
    const y = rookY.current;
    ctx.save();
    ctx.translate(ROOK_X, y);
    const angle = Math.max(-0.4, Math.min(0.9, velocity.current / 12));
    ctx.rotate(angle);
    ctx.fillStyle = "#e9c73f";
    ctx.beginPath();
    ctx.roundRect(-ROOK_R, -ROOK_R * 0.6, ROOK_R * 2, ROOK_R * 1.6, 4);
    ctx.fill();
    ctx.fillRect(-ROOK_R, -ROOK_R * 1.3, ROOK_R * 2, ROOK_R * 0.5);
    ctx.fillRect(-ROOK_R, -ROOK_R * 1.3, ROOK_R * 0.5, ROOK_R * 0.5);
    ctx.fillRect(-ROOK_R * 0.15, -ROOK_R * 1.3, ROOK_R * 0.3, ROOK_R * 0.5);
    ctx.fillRect(ROOK_R * 0.5, -ROOK_R * 1.3, ROOK_R * 0.5, ROOK_R * 0.5);
    ctx.restore();
  }, []);

  const resetGame = useCallback(() => {
    rookY.current = HEIGHT / 2;
    velocity.current = 0;
    pipes.current = [];
    frame.current = 0;
    scoreRef.current = 0;
    speedRef.current = PIPE_SPEED_START;
    launchedRef.current = false;
    setLaunched(false);
    setScore(0);
    setOver(false);
    setRunning(true);
    draw();
  }, [draw]);

  const flap = useCallback(() => {
    if (over) return;
    if (!launchedRef.current) {
      launchedRef.current = true;
      setLaunched(true);
    }
    velocity.current = FLAP_VELOCITY;
    playArcadeSound("swoosh");
  }, [over]);

  const tick = useCallback(() => {
    if (!launchedRef.current) {
      draw();
      return;
    }
    velocity.current += GRAVITY;
    rookY.current += velocity.current;

    frame.current++;
    if (frame.current % 90 === 0) {
      const margin = 60;
      const gapY = margin + Math.random() * (HEIGHT - margin * 2);
      pipes.current.push({ x: WIDTH, gapY, passed: false });
    }
    for (const p of pipes.current) p.x -= speedRef.current;
    pipes.current = pipes.current.filter((p) => p.x + PIPE_W > -10);

    let hit = rookY.current - ROOK_R < 0 || rookY.current + ROOK_R > HEIGHT;
    for (const p of pipes.current) {
      const withinX = ROOK_X + ROOK_R > p.x && ROOK_X - ROOK_R < p.x + PIPE_W;
      if (withinX) {
        const inGap = rookY.current - ROOK_R > p.gapY - GAP_H / 2 && rookY.current + ROOK_R < p.gapY + GAP_H / 2;
        if (!inGap) hit = true;
      }
      if (!p.passed && p.x + PIPE_W < ROOK_X - ROOK_R) {
        p.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
        playArcadeSound("correct");
        speedRef.current = Math.min(5, PIPE_SPEED_START + scoreRef.current * 0.08);
      }
    }

    if (hit) {
      setOver(true);
      setRunning(false);
      playArcadeSound("gameOver");
      submit(scoreRef.current);
      return;
    }
    draw();
  }, [draw, submit]);

  useEffect(() => {
    if (!running) return;
    const loop = () => {
      tick();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, tick]);

  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        if (over) resetGame();
        else flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap, over, resetGame]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ width: WIDTH, height: HEIGHT }}
        onClick={() => (over ? resetGame() : flap())}
      >
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
        {!launched && running && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Click or press space to flap
          </div>
        )}
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <p className="text-xl font-bold text-white">Game over — {score} points</p>
            <button className="btn btn-primary" onClick={resetGame}>
              Play again
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Click, tap, or press space/up to flap through the gaps.</p>
    </div>
  );
}
