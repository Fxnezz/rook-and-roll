"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";

const GRID = 20;
const CELL = 20; // px
const SIZE = GRID * CELL;
const START_SPEED = 140; // ms per tick
const MIN_SPEED = 60;

type Pt = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
const DELTA: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

function randomFood(snake: Pt[]): Pt {
  while (true) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { best, submit } = useHighScore("snake");
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);

  const snakeRef = useRef<Pt[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Dir>("right");
  const nextDirRef = useRef<Dir>("right");
  const foodRef = useRef<Pt>({ x: 15, y: 10 });
  const speedRef = useRef(START_SPEED);
  const lastTickRef = useRef(0);
  const rafRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const touchStart = useRef<Pt | null>(null);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#161b24";
    ctx.fillRect(0, 0, SIZE, SIZE);
    // food
    ctx.fillStyle = "#e5604d";
    ctx.beginPath();
    ctx.arc(foodRef.current.x * CELL + CELL / 2, foodRef.current.y * CELL + CELL / 2, CELL / 2.4, 0, Math.PI * 2);
    ctx.fill();
    // snake
    snakeRef.current.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#f4b451" : "#e9a23b";
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = "right";
    nextDirRef.current = "right";
    foodRef.current = randomFood(snakeRef.current);
    speedRef.current = START_SPEED;
    scoreRef.current = 0;
    setScore(0);
    setOver(false);
    lastTickRef.current = 0;
    draw();
  }, [draw]);

  const tick = useCallback(() => {
    dirRef.current = nextDirRef.current;
    const head = snakeRef.current[0];
    const d = DELTA[dirRef.current];
    const next = { x: head.x + d.x, y: head.y + d.y };
    const hitWall = next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID;
    const hitSelf = snakeRef.current.some((s) => s.x === next.x && s.y === next.y);
    if (hitWall || hitSelf) {
      setOver(true);
      setRunning(false);
      submit(scoreRef.current);
      return;
    }
    const ate = next.x === foodRef.current.x && next.y === foodRef.current.y;
    snakeRef.current = [next, ...snakeRef.current];
    if (ate) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      foodRef.current = randomFood(snakeRef.current);
      speedRef.current = Math.max(MIN_SPEED, START_SPEED - Math.floor(scoreRef.current / 5));
    } else {
      snakeRef.current.pop();
    }
    draw();
  }, [draw, submit]);

  useEffect(() => {
    if (!running) return;
    const loop = (t: number) => {
      if (t - lastTickRef.current >= speedRef.current) {
        lastTickRef.current = t;
        tick();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, tick]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  }, [running, over]);

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
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/60">
            <p className="text-lg font-bold text-white">{over ? "Game over" : "Snake"}</p>
            {over && <p className="text-sm text-white/80">Score: {score}</p>}
            <button
              className="btn btn-primary"
              onClick={() => {
                if (over) reset();
                setRunning(true);
              }}
            >
              {over ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Arrow keys / WASD, or swipe on mobile.</p>
    </div>
  );
}
