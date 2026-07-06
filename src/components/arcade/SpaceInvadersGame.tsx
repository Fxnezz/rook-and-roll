"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const WIDTH = 360;
const HEIGHT = 480;
const PLAYER_W = 30;
const PLAYER_H = 14;
const PLAYER_Y = HEIGHT - 30;
const PLAYER_SPEED = 4.5;
const BULLET_W = 3;
const BULLET_H = 10;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;
const ALIEN_W = 26;
const ALIEN_H = 16;
const ALIEN_GAP_X = 10;
const ALIEN_GAP_Y = 14;
const ALIEN_TOP = 40;
const ALIEN_STEP_DOWN = 16;
const ROW_COLORS = ["#e5604d", "#e9a23b", "#5bbf7a", "#5aa8e0"];

interface Alien {
  col: number;
  row: number;
  alive: boolean;
}
interface Bullet {
  x: number;
  y: number;
}

function makeAliens(): Alien[] {
  const aliens: Alien[] = [];
  for (let row = 0; row < ALIEN_ROWS; row++) {
    for (let col = 0; col < ALIEN_COLS; col++) {
      aliens.push({ row, col, alive: true });
    }
  }
  return aliens;
}

export function SpaceInvadersGame() {
  const { best, submit } = useHighScore("spaceinvaders", { higherIsBetter: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const playerXRef = useRef((WIDTH - PLAYER_W) / 2);
  const keysRef = useRef<Set<string>>(new Set());
  const aliensRef = useRef<Alien[]>(makeAliens());
  const formationRef = useRef({ x: 0, y: 0, dir: 1 });
  const speedRef = useRef(0.6);
  const playerBulletsRef = useRef<Bullet[]>([]);
  const alienBulletsRef = useRef<Bullet[]>([]);
  const waveRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const frameRef = useRef(0);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  const alienWidth = ALIEN_COLS * (ALIEN_W + ALIEN_GAP_X) - ALIEN_GAP_X;

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const { x: fx, y: fy } = formationRef.current;
    for (const a of aliensRef.current) {
      if (!a.alive) continue;
      const x = fx + a.col * (ALIEN_W + ALIEN_GAP_X);
      const y = fy + ALIEN_TOP + a.row * (ALIEN_H + ALIEN_GAP_Y);
      ctx.fillStyle = ROW_COLORS[a.row % ROW_COLORS.length];
      ctx.fillRect(x, y, ALIEN_W, ALIEN_H);
    }

    ctx.fillStyle = "#e8ecf3";
    ctx.fillRect(playerXRef.current, PLAYER_Y, PLAYER_W, PLAYER_H);

    ctx.fillStyle = "#f7c065";
    for (const b of playerBulletsRef.current) ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
    ctx.fillStyle = "#e5604d";
    for (const b of alienBulletsRef.current) ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
  }, []);

  const startWave = useCallback((n: number) => {
    waveRef.current = n;
    aliensRef.current = makeAliens();
    formationRef.current = { x: (WIDTH - alienWidth) / 2, y: 0, dir: 1 };
    speedRef.current = 0.6 + n * 0.25;
    playerBulletsRef.current = [];
    alienBulletsRef.current = [];
    setWave(n + 1);
  }, [alienWidth]);

  const reset = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setOver(false);
    setRunning(true);
    startWave(0);
    playerXRef.current = (WIDTH - PLAYER_W) / 2;
    draw();
  }, [draw, startWave]);

  const tick = useCallback(() => {
    frameRef.current++;

    if (keysRef.current.has("ArrowLeft")) playerXRef.current = Math.max(0, playerXRef.current - PLAYER_SPEED);
    if (keysRef.current.has("ArrowRight")) playerXRef.current = Math.min(WIDTH - PLAYER_W, playerXRef.current + PLAYER_SPEED);

    // Move alien formation, bouncing off the walls and stepping down.
    const f = formationRef.current;
    const alive = aliensRef.current.filter((a) => a.alive);
    if (alive.length > 0) {
      const minCol = Math.min(...alive.map((a) => a.col));
      const maxCol = Math.max(...alive.map((a) => a.col));
      const leftEdge = f.x + minCol * (ALIEN_W + ALIEN_GAP_X);
      const rightEdge = f.x + maxCol * (ALIEN_W + ALIEN_GAP_X) + ALIEN_W;
      f.x += f.dir * speedRef.current;
      if (leftEdge <= 4 || rightEdge >= WIDTH - 4) {
        f.dir *= -1;
        f.y += ALIEN_STEP_DOWN;
      }
    }

    // Player bullets.
    for (const b of playerBulletsRef.current) b.y -= 6;
    playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.y > -BULLET_H);

    // Alien bullets.
    for (const b of alienBulletsRef.current) b.y += 4;
    alienBulletsRef.current = alienBulletsRef.current.filter((b) => b.y < HEIGHT);

    // Random alien fire.
    if (frameRef.current % 45 === 0 && alive.length > 0) {
      const byCol = new Map<number, Alien>();
      for (const a of alive) {
        const existing = byCol.get(a.col);
        if (!existing || a.row > existing.row) byCol.set(a.col, a);
      }
      const shooters = [...byCol.values()];
      const shooter = shooters[Math.floor(Math.random() * shooters.length)];
      const x = f.x + shooter.col * (ALIEN_W + ALIEN_GAP_X) + ALIEN_W / 2;
      const y = f.y + ALIEN_TOP + shooter.row * (ALIEN_H + ALIEN_GAP_Y) + ALIEN_H;
      alienBulletsRef.current.push({ x, y });
    }

    // Player bullet vs alien collision.
    for (const b of playerBulletsRef.current) {
      for (const a of aliensRef.current) {
        if (!a.alive) continue;
        const x = f.x + a.col * (ALIEN_W + ALIEN_GAP_X);
        const y = f.y + ALIEN_TOP + a.row * (ALIEN_H + ALIEN_GAP_Y);
        if (b.x + BULLET_W > x && b.x < x + ALIEN_W && b.y < y + ALIEN_H && b.y + BULLET_H > y) {
          a.alive = false;
          b.y = -100;
          scoreRef.current += (ALIEN_ROWS - a.row) * 10;
          setScore(scoreRef.current);
          playArcadeSound("merge");
          break;
        }
      }
    }
    playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.y > -BULLET_H);

    // Alien bullet vs player collision.
    for (const b of alienBulletsRef.current) {
      if (b.x + BULLET_W > playerXRef.current && b.x < playerXRef.current + PLAYER_W && b.y + BULLET_H > PLAYER_Y && b.y < PLAYER_Y + PLAYER_H) {
        b.y = HEIGHT + 100;
        livesRef.current -= 1;
        setLives(livesRef.current);
        playArcadeSound("wrong");
        if (livesRef.current <= 0) {
          setOver(true);
          setRunning(false);
          playArcadeSound("gameOver");
          submit(scoreRef.current);
        }
      }
    }
    alienBulletsRef.current = alienBulletsRef.current.filter((b) => b.y < HEIGHT);

    // Aliens reaching the player row ends the game.
    const stillAlive = aliensRef.current.filter((a) => a.alive);
    if (stillAlive.length > 0) {
      const maxY = Math.max(...stillAlive.map((a) => f.y + ALIEN_TOP + a.row * (ALIEN_H + ALIEN_GAP_Y) + ALIEN_H));
      if (maxY >= PLAYER_Y && running) {
        setOver(true);
        setRunning(false);
        playArcadeSound("gameOver");
        submit(scoreRef.current);
      }
    } else if (stillAlive.length === 0) {
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
    if (playerBulletsRef.current.length >= 3) return;
    playerBulletsRef.current.push({ x: playerXRef.current + PLAYER_W / 2 - BULLET_W / 2, y: PLAYER_Y - BULLET_H });
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
      <p className="text-xs text-[var(--text-faint)]">Arrow keys to move, space or click/tap to fire.</p>
    </div>
  );
}
