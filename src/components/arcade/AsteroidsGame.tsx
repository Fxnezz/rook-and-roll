"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const WIDTH = 420;
const HEIGHT = 420;
const SHIP_SIZE = 12;
const THRUST = 0.12;
const FRICTION = 0.99;
const TURN_SPEED = 0.06;
const BULLET_SPEED = 5;
const BULLET_LIFE = 60;

type Size = "large" | "medium" | "small";
const RADIUS: Record<Size, number> = { large: 28, medium: 16, small: 9 };
const POINTS: Record<Size, number> = { large: 20, medium: 50, small: 100 };

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: Size;
}
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

function wrap(v: number, max: number): number {
  if (v < 0) return v + max;
  if (v > max) return v - max;
  return v;
}

function spawnAsteroid(size: Size, avoid: { x: number; y: number }): Asteroid {
  let x = 0;
  let y = 0;
  do {
    x = Math.random() * WIDTH;
    y = Math.random() * HEIGHT;
  } while (Math.hypot(x - avoid.x, y - avoid.y) < 100);
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.6 + Math.random() * 0.8;
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size };
}

export function AsteroidsGame() {
  const { best, submit } = useHighScore("asteroids", { higherIsBetter: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const shipRef = useRef({ x: WIDTH / 2, y: HEIGHT / 2, angle: -Math.PI / 2, vx: 0, vy: 0 });
  const asteroidsRef = useRef<Asteroid[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const waveRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const invulnRef = useRef(0);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const ship = shipRef.current;
    if (invulnRef.current % 6 < 3) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = "#e8ecf3";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SHIP_SIZE, 0);
      ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.7);
      ctx.lineTo(-SHIP_SIZE * 0.4, 0);
      ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.7);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = "#f7c065";
    for (const a of asteroidsRef.current) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, RADIUS[a.size], 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#9ad1ff";
    for (const b of bulletsRef.current) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const startWave = useCallback((n: number) => {
    waveRef.current = n;
    const count = 2 + n;
    asteroidsRef.current = Array.from({ length: count }, () => spawnAsteroid("large", shipRef.current));
    setWave(n + 1);
  }, []);

  const reset = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    shipRef.current = { x: WIDTH / 2, y: HEIGHT / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
    bulletsRef.current = [];
    invulnRef.current = 90;
    setScore(0);
    setLives(3);
    setOver(false);
    setRunning(true);
    startWave(0);
    draw();
  }, [draw, startWave]);

  const tick = useCallback(() => {
    const ship = shipRef.current;
    if (keysRef.current.has("ArrowLeft")) ship.angle -= TURN_SPEED;
    if (keysRef.current.has("ArrowRight")) ship.angle += TURN_SPEED;
    if (keysRef.current.has("ArrowUp")) {
      ship.vx += Math.cos(ship.angle) * THRUST;
      ship.vy += Math.sin(ship.angle) * THRUST;
    }
    ship.vx *= FRICTION;
    ship.vy *= FRICTION;
    ship.x = wrap(ship.x + ship.vx, WIDTH);
    ship.y = wrap(ship.y + ship.vy, HEIGHT);
    if (invulnRef.current > 0) invulnRef.current--;

    for (const a of asteroidsRef.current) {
      a.x = wrap(a.x + a.vx, WIDTH);
      a.y = wrap(a.y + a.vy, HEIGHT);
    }

    for (const b of bulletsRef.current) {
      b.x = wrap(b.x + b.vx, WIDTH);
      b.y = wrap(b.y + b.vy, HEIGHT);
      b.life--;
    }
    bulletsRef.current = bulletsRef.current.filter((b) => b.life > 0);

    const nextAsteroids: Asteroid[] = [];
    for (const a of asteroidsRef.current) {
      const hitBulletIdx = bulletsRef.current.findIndex((b) => Math.hypot(b.x - a.x, b.y - a.y) < RADIUS[a.size]);
      if (hitBulletIdx >= 0) {
        bulletsRef.current.splice(hitBulletIdx, 1);
        scoreRef.current += POINTS[a.size];
        setScore(scoreRef.current);
        playArcadeSound("merge");
        if (a.size !== "small") {
          const nextSize: Size = a.size === "large" ? "medium" : "small";
          for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random();
            nextAsteroids.push({ x: a.x, y: a.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: nextSize });
          }
        }
        continue;
      }
      nextAsteroids.push(a);
    }
    asteroidsRef.current = nextAsteroids;

    if (invulnRef.current <= 0) {
      const hitShip = asteroidsRef.current.some((a) => Math.hypot(a.x - ship.x, a.y - ship.y) < RADIUS[a.size] + SHIP_SIZE * 0.5);
      if (hitShip) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        playArcadeSound("wrong");
        if (livesRef.current <= 0) {
          setOver(true);
          setRunning(false);
          playArcadeSound("gameOver");
          submit(scoreRef.current);
        } else {
          ship.x = WIDTH / 2;
          ship.y = HEIGHT / 2;
          ship.vx = 0;
          ship.vy = 0;
          invulnRef.current = 90;
        }
      }
    }

    if (asteroidsRef.current.length === 0 && running) {
      playArcadeSound("levelUp");
      startWave(waveRef.current + 1);
    }

    draw();
  }, [draw, running, startWave, submit]);

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
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fire = useCallback(() => {
    if (!running) return;
    const ship = shipRef.current;
    bulletsRef.current.push({
      x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
      y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
      vx: Math.cos(ship.angle) * BULLET_SPEED,
      vy: Math.sin(ship.angle) * BULLET_SPEED,
      life: BULLET_LIFE,
    });
    playArcadeSound("click");
  }, [running]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " ") fire();
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [fire]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        <span className="chip">Wave: {wave}</span>
        <span className="chip">Lives: {"❤️".repeat(Math.max(0, lives))}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>
      <div className="relative overflow-hidden rounded-xl" style={{ width: WIDTH, height: HEIGHT }} onClick={fire}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <p className="text-xl font-bold text-white">Game over</p>
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); reset(); }}>
              Play again
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Arrow keys to rotate/thrust, space or click/tap to fire.</p>
    </div>
  );
}
