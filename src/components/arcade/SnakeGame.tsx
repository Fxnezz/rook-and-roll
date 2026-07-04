"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const GRID = 20;
const CELL = 20; // px
const SIZE = GRID * CELL;
const START_SPEED = 140; // ms per tick
const MIN_SPEED = 60;
const OBSTACLE_COUNT = 6;

type Pt = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
const DELTA: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

function randomFree(occupied: Pt[]): Pt {
  while (true) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!occupied.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function roundedSegment(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, stroke?: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, CELL - 2, CELL - 2, r);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { best, submit } = useHighScore("snake");
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [obstaclesOn, setObstaclesOn] = useState(false);

  const snakeRef = useRef<Pt[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Dir>("right");
  const nextDirRef = useRef<Dir>("right");
  const foodRef = useRef<Pt>({ x: 15, y: 10 });
  const obstaclesRef = useRef<Pt[]>([]);
  const speedRef = useRef(START_SPEED);
  const lastTickRef = useRef(0);
  const rafRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const touchStart = useRef<Pt | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pausedRef = useRef(false);

  const spawnBurst = (cx: number, cy: number) => {
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      particlesRef.current.push({
        x: cx * CELL + CELL / 2,
        y: cy * CELL + CELL / 2,
        vx: Math.cos(a) * 1.8,
        vy: Math.sin(a) * 1.8,
        life: 1,
        color: i % 2 === 0 ? "#f4b451" : "#e5604d",
      });
    }
  };

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#141821";
    ctx.fillRect(0, 0, SIZE, SIZE);
    // subtle grid texture
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(SIZE, i * CELL);
      ctx.stroke();
    }

    // obstacles
    obstaclesRef.current.forEach((o) => {
      ctx.fillStyle = "#3d4454";
      ctx.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = "#565f73";
      ctx.strokeRect(o.x * CELL + 1.5, o.y * CELL + 1.5, CELL - 3, CELL - 3);
    });

    // food — apple-like sprite with a small stem
    const fx = foodRef.current.x * CELL + CELL / 2;
    const fy = foodRef.current.y * CELL + CELL / 2;
    const pulse = 1 + 0.08 * Math.sin(performance.now() / 180);
    const grad = ctx.createRadialGradient(fx - 3, fy - 4, 1, fx, fy, CELL / 2);
    grad.addColorStop(0, "#ff8a70");
    grad.addColorStop(1, "#d8402a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx, fy, (CELL / 2.6) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a9c4a";
    ctx.fillRect(fx - 1, fy - CELL / 2, 2, 4);

    // snake — rounded gradient body with eyes on the head
    const segs = snakeRef.current;
    segs.forEach((seg, i) => {
      const t = i / Math.max(1, segs.length - 1);
      const isHead = i === 0;
      const color = isHead ? "#f7c065" : `rgb(${233 - t * 40}, ${162 - t * 30}, 59)`;
      roundedSegment(ctx, seg.x * CELL + 1, seg.y * CELL + 1, isHead ? 7 : 5, color, isHead ? "#c9860f" : undefined);
    });
    if (segs.length) {
      const head = segs[0];
      const d = DELTA[dirRef.current];
      const cx = head.x * CELL + CELL / 2;
      const cy = head.y * CELL + CELL / 2;
      const ex = d.x * 4;
      const ey = d.y * 4;
      const perpX = -d.y * 3.5;
      const perpY = d.x * 3.5;
      [1, -1].forEach((s) => {
        ctx.fillStyle = "#1c1408";
        ctx.beginPath();
        ctx.arc(cx + ex + perpX * s, cy + ey + perpY * s, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // particles
    particlesRef.current.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }, []);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = "right";
    nextDirRef.current = "right";
    obstaclesRef.current = obstaclesOn
      ? Array.from({ length: OBSTACLE_COUNT }, () => randomFree([...snakeRef.current, { x: 10, y: 10 }]))
      : [];
    foodRef.current = randomFree([...snakeRef.current, ...obstaclesRef.current]);
    speedRef.current = START_SPEED;
    scoreRef.current = 0;
    particlesRef.current = [];
    setScore(0);
    setOver(false);
    setPaused(false);
    pausedRef.current = false;
    lastTickRef.current = 0;
    draw();
  }, [draw, obstaclesOn]);

  const tick = useCallback(() => {
    dirRef.current = nextDirRef.current;
    const head = snakeRef.current[0];
    const d = DELTA[dirRef.current];
    const next = { x: head.x + d.x, y: head.y + d.y };
    const hitWall = next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID;
    const hitSelf = snakeRef.current.some((s) => s.x === next.x && s.y === next.y);
    const hitObstacle = obstaclesRef.current.some((o) => o.x === next.x && o.y === next.y);
    if (hitWall || hitSelf || hitObstacle) {
      setOver(true);
      setRunning(false);
      playArcadeSound("gameOver");
      submit(scoreRef.current);
      return;
    }
    const ate = next.x === foodRef.current.x && next.y === foodRef.current.y;
    snakeRef.current = [next, ...snakeRef.current];
    if (ate) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      spawnBurst(next.x, next.y);
      playArcadeSound("eat");
      foodRef.current = randomFree([...snakeRef.current, ...obstaclesRef.current]);
      speedRef.current = Math.max(MIN_SPEED, START_SPEED - Math.floor(scoreRef.current / 5));
    } else {
      snakeRef.current.pop();
    }
  }, [submit]);

  useEffect(() => {
    if (!running) return;
    const loop = (t: number) => {
      if (!pausedRef.current && t - lastTickRef.current >= speedRef.current) {
        lastTickRef.current = t;
        tick();
      }
      particlesRef.current = particlesRef.current
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.05 }))
        .filter((p) => p.life > 0);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, tick, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const togglePause = useCallback(() => {
    if (!running || over) return;
    setPaused((p) => {
      pausedRef.current = !p;
      return !p;
    });
  }, [running, over]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        togglePause();
        return;
      }
      const map: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      if (dir !== OPPOSITE[dirRef.current]) nextDirRef.current = dir;
      if (!running && !over) setRunning(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, over, togglePause]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    if (dir !== OPPOSITE[dirRef.current]) nextDirRef.current = dir;
    if (!running && !over) setRunning(true);
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[420px] items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        {!running && !over && (
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <input type="checkbox" checked={obstaclesOn} onChange={(e) => setObstaclesOn(e.target.checked)} />
            Obstacles
          </label>
        )}
        {running && !over && (
          <button className="btn btn-ghost !py-1 text-xs" onClick={togglePause}>
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        {best != null && <span className="chip">Best: {best}</span>}
      </div>
      <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-lg"
          style={{ touchAction: "none", maxWidth: "90vw", aspectRatio: "1/1" }}
        />
        {(!running || paused) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/60">
            <p className="text-lg font-bold text-white">{over ? "Game over" : paused ? "Paused" : "Snake"}</p>
            {over && <p className="text-sm text-white/80">Score: {score}</p>}
            <button
              className="btn btn-primary"
              onClick={() => {
                if (paused) {
                  togglePause();
                  return;
                }
                if (over) reset();
                setRunning(true);
              }}
            >
              {paused ? "Resume" : over ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Arrow keys / WASD, or swipe on mobile. Space to pause.</p>
    </div>
  );
}
