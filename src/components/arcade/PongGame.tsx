"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";

const WIDTH = 420;
const HEIGHT = 300;
const PADDLE_W = 10;
const PADDLE_H = 60;
const BALL_R = 6;
const PLAYER_X = 16;
const AI_X = WIDTH - 16 - PADDLE_W;
const AI_SPEED = 3.2;
const WIN_SCORE = 7;

export function PongGame() {
  const { best, submit } = useHighScore("pong", { higherIsBetter: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const playerYRef = useRef((HEIGHT - PADDLE_H) / 2);
  const aiYRef = useRef((HEIGHT - PADDLE_H) / 2);
  const ballRef = useRef({ x: WIDTH / 2, y: HEIGHT / 2, vx: 3.2, vy: 2 });
  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#141821";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#e8ecf3";
    ctx.fillRect(PLAYER_X, playerYRef.current, PADDLE_W, PADDLE_H);
    ctx.fillRect(AI_X, aiYRef.current, PADDLE_W, PADDLE_H);

    ctx.beginPath();
    ctx.fillStyle = "#f7c065";
    ctx.arc(ballRef.current.x, ballRef.current.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const resetBall = useCallback((towardPlayer: boolean) => {
    ballRef.current = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: towardPlayer ? -3.2 : 3.2,
      vy: Math.random() * 4 - 2,
    };
  }, []);

  const reset = useCallback(() => {
    playerScoreRef.current = 0;
    aiScoreRef.current = 0;
    playerYRef.current = (HEIGHT - PADDLE_H) / 2;
    aiYRef.current = (HEIGHT - PADDLE_H) / 2;
    setPlayerScore(0);
    setAiScore(0);
    setOver(false);
    setRunning(true);
    resetBall(Math.random() < 0.5);
    draw();
  }, [draw, resetBall]);

  const tick = useCallback(() => {
    const ball = ballRef.current;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R;
      ball.vy *= -1;
    } else if (ball.y + BALL_R > HEIGHT) {
      ball.y = HEIGHT - BALL_R;
      ball.vy *= -1;
    }

    // AI tracks the ball with a capped speed.
    const aiCenter = aiYRef.current + PADDLE_H / 2;
    if (aiCenter < ball.y - 6) aiYRef.current = Math.min(HEIGHT - PADDLE_H, aiYRef.current + AI_SPEED);
    else if (aiCenter > ball.y + 6) aiYRef.current = Math.max(0, aiYRef.current - AI_SPEED);

    // Player paddle collision.
    if (
      ball.vx < 0 &&
      ball.x - BALL_R <= PLAYER_X + PADDLE_W &&
      ball.x - BALL_R >= PLAYER_X &&
      ball.y >= playerYRef.current &&
      ball.y <= playerYRef.current + PADDLE_H
    ) {
      const hitPos = (ball.y - (playerYRef.current + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, 9);
      ball.vx = Math.abs(speed * Math.cos(hitPos * 0.6));
      ball.vy = speed * Math.sin(hitPos * 0.6) + hitPos;
      ball.x = PLAYER_X + PADDLE_W + BALL_R;
      playArcadeSound("click");
    }

    // AI paddle collision.
    if (
      ball.vx > 0 &&
      ball.x + BALL_R >= AI_X &&
      ball.x + BALL_R <= AI_X + PADDLE_W &&
      ball.y >= aiYRef.current &&
      ball.y <= aiYRef.current + PADDLE_H
    ) {
      const hitPos = (ball.y - (aiYRef.current + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, 9);
      ball.vx = -Math.abs(speed * Math.cos(hitPos * 0.6));
      ball.vy = speed * Math.sin(hitPos * 0.6) + hitPos;
      ball.x = AI_X - BALL_R;
      playArcadeSound("click");
    }

    if (ball.x + BALL_R < 0) {
      aiScoreRef.current += 1;
      setAiScore(aiScoreRef.current);
      playArcadeSound("wrong");
      if (aiScoreRef.current >= WIN_SCORE) {
        setOver(true);
        setRunning(false);
        playArcadeSound("gameOver");
        submit(playerScoreRef.current);
      } else {
        resetBall(false);
      }
    } else if (ball.x - BALL_R > WIDTH) {
      playerScoreRef.current += 1;
      setPlayerScore(playerScoreRef.current);
      playArcadeSound("merge");
      if (playerScoreRef.current >= WIN_SCORE) {
        setOver(true);
        setRunning(false);
        playArcadeSound("win");
        submit(playerScoreRef.current);
      } else {
        resetBall(true);
      }
    }

    draw();
  }, [draw, resetBall, submit]);

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

  const movePaddle = (clientY: number, rect: DOMRect) => {
    const y = ((clientY - rect.top) / rect.height) * HEIGHT - PADDLE_H / 2;
    playerYRef.current = Math.max(0, Math.min(HEIGHT - PADDLE_H, y));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") playerYRef.current = Math.max(0, playerYRef.current - 24);
      else if (e.key === "ArrowDown") playerYRef.current = Math.min(HEIGHT - PADDLE_H, playerYRef.current + 24);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">You: {playerScore}</span>
        <span className="chip">Bot: {aiScore}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ width: WIDTH, height: HEIGHT }}
        onMouseMove={(e) => movePaddle(e.clientY, e.currentTarget.getBoundingClientRect())}
        onTouchMove={(e) => movePaddle(e.touches[0].clientY, e.currentTarget.getBoundingClientRect())}
      >
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <p className="text-xl font-bold text-white">{playerScore > aiScore ? "You win!" : "Bot wins"}</p>
            <button className="btn btn-primary" onClick={reset}>
              Play again
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Move your paddle with your mouse, touch, or arrow keys. First to {WIN_SCORE} wins.</p>
    </div>
  );
}
