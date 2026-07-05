"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const WIDTH = 360;
const HEIGHT = 480;
const PADDLE_W = 70;
const PADDLE_H = 10;
const PADDLE_Y = HEIGHT - 30;
const BALL_R = 5;
const ROWS = 5;
const COLS = 8;
const BRICK_W = WIDTH / COLS;
const BRICK_H = 16;
const BRICK_TOP = 40;
const ROW_COLORS = ["#e5604d", "#e9a23b", "#e0c34a", "#5bbf7a", "#5aa8e0"];

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  color: string;
  points: number;
}

function makeBricks(level: number): Brick[] {
  const bricks: Brick[] = [];
  const rows = Math.min(ROWS + Math.floor(level / 2), 8);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({ x: c * BRICK_W, y: BRICK_TOP + r * (BRICK_H + 4), alive: true, color: ROW_COLORS[r % ROW_COLORS.length], points: (rows - r) * 10 });
    }
  }
  return bricks;
}

export function BreakoutGame() {
  const { best, submit } = useHighScore("breakout", { higherIsBetter: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const paddleXRef = useRef((WIDTH - PADDLE_W) / 2);
  const ballRef = useRef({ x: WIDTH / 2, y: PADDLE_Y - BALL_R - 1, vx: 2.4, vy: -2.4 });
  const bricksRef = useRef<Brick[]>(makeBricks(0));
  const levelRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const launchedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [launched, setLaunched] = useState(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#141821";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const b of bricksRef.current) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x + 2, b.y, BRICK_W - 4, BRICK_H);
    }

    ctx.fillStyle = "#e8ecf3";
    ctx.fillRect(paddleXRef.current, PADDLE_Y, PADDLE_W, PADDLE_H);

    const ball = ballRef.current;
    ctx.beginPath();
    ctx.fillStyle = "#f7c065";
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const resetBall = useCallback(() => {
    ballRef.current = { x: paddleXRef.current + PADDLE_W / 2, y: PADDLE_Y - BALL_R - 1, vx: 2.4, vy: -2.4 };
    launchedRef.current = false;
    setLaunched(false);
  }, []);

  const nextLevel = useCallback(() => {
    levelRef.current += 1;
    setLevel(levelRef.current + 1);
    bricksRef.current = makeBricks(levelRef.current);
    resetBall();
    playArcadeSound("levelUp");
  }, [resetBall]);

  const reset = useCallback(() => {
    levelRef.current = 0;
    scoreRef.current = 0;
    livesRef.current = 3;
    bricksRef.current = makeBricks(0);
    resetBall();
    setScore(0);
    setLives(3);
    setLevel(1);
    setOver(false);
    setRunning(true);
    draw();
  }, [draw, resetBall]);

  const tick = useCallback(() => {
    const ball = ballRef.current;
    if (!launchedRef.current) {
      ball.x = paddleXRef.current + PADDLE_W / 2;
      draw();
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - BALL_R < 0) {
      ball.x = BALL_R;
      ball.vx *= -1;
    } else if (ball.x + BALL_R > WIDTH) {
      ball.x = WIDTH - BALL_R;
      ball.vx *= -1;
    }
    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R;
      ball.vy *= -1;
    }

    // paddle collision
    if (
      ball.vy > 0 &&
      ball.y + BALL_R >= PADDLE_Y &&
      ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 6 &&
      ball.x >= paddleXRef.current &&
      ball.x <= paddleXRef.current + PADDLE_W
    ) {
      const hitPos = (ball.x - (paddleXRef.current + PADDLE_W / 2)) / (PADDLE_W / 2); // -1..1
      const speed = Math.hypot(ball.vx, ball.vy);
      const angle = hitPos * (Math.PI / 3); // up to 60 degrees
      ball.vx = speed * Math.sin(angle);
      ball.vy = -Math.abs(speed * Math.cos(angle));
      ball.y = PADDLE_Y - BALL_R - 1;
      playArcadeSound("click");
    }

    // brick collision
    for (const b of bricksRef.current) {
      if (!b.alive) continue;
      if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + BRICK_W && ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + BRICK_H) {
        b.alive = false;
        ball.vy *= -1;
        scoreRef.current += b.points;
        setScore(scoreRef.current);
        playArcadeSound("merge");
        break;
      }
    }

    if (ball.y - BALL_R > HEIGHT) {
      livesRef.current -= 1;
      setLives(livesRef.current);
      playArcadeSound("wrong");
      if (livesRef.current <= 0) {
        setOver(true);
        setRunning(false);
        playArcadeSound("gameOver");
        submit(scoreRef.current);
      } else {
        resetBall();
      }
    }

    if (bricksRef.current.every((b) => !b.alive)) {
      nextLevel();
    }

    draw();
  }, [draw, resetBall, nextLevel, submit]);

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

  const movePaddle = (clientX: number, rect: DOMRect) => {
    const x = ((clientX - rect.left) / rect.width) * WIDTH - PADDLE_W / 2;
    paddleXRef.current = Math.max(0, Math.min(WIDTH - PADDLE_W, x));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") paddleXRef.current = Math.max(0, paddleXRef.current - 24);
      else if (e.key === "ArrowRight") paddleXRef.current = Math.min(WIDTH - PADDLE_W, paddleXRef.current + 24);
      else if (e.key === " ") { launchedRef.current = true; setLaunched(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        <span className="chip">Level: {level}</span>
        <span className="chip">
          Lives: {"❤️".repeat(Math.max(0, lives))}
        </span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ width: WIDTH, height: HEIGHT }}
        onMouseMove={(e) => movePaddle(e.clientX, e.currentTarget.getBoundingClientRect())}
        onTouchMove={(e) => movePaddle(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
        onClick={() => {
          if (!launchedRef.current) { launchedRef.current = true; setLaunched(true); }
        }}
      >
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
        {!launched && running && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Click or press space to launch
          </div>
        )}
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <p className="text-xl font-bold text-white">Game over</p>
            <button className="btn btn-primary" onClick={reset}>
              Play again
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Move the paddle with your mouse, touch, or arrow keys.</p>
    </div>
  );
}
