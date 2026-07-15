"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { COLS, ROWS, CELL, WIDTH, HEIGHT, LANES, laneObstacles, overlaps, laneAt } from "@/lib/arcade/frogger";

const HOMES_PER_LEVEL = 5;

export function FroggerGame() {
  const { best, submit } = useHighScore("frogger", { higherIsBetter: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);

  const frogRef = useRef({ x: Math.floor(COLS / 2) * CELL, row: ROWS - 1 });
  const homesFilledRef = useRef<Set<number>>(new Set());
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#101418";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const lane of LANES) {
      const y = lane.row * CELL;
      const laneGradient = ctx.createLinearGradient(0, y, 0, y + CELL);
      if (lane.type === "river") { laneGradient.addColorStop(0, "#1d5672"); laneGradient.addColorStop(1, "#0c2e45"); }
      else if (lane.type === "road") { laneGradient.addColorStop(0, "#353840"); laneGradient.addColorStop(1, "#1d2027"); }
      else { laneGradient.addColorStop(0, lane.type === "goal" ? "#245a3b" : "#183225"); laneGradient.addColorStop(1, "#102219"); }
      ctx.fillStyle = laneGradient;
      ctx.fillRect(0, y, WIDTH, CELL);
      if (lane.type === "river") {
        ctx.strokeStyle = "rgba(147,220,255,0.18)";
        ctx.lineWidth = 1;
        for (let x = -20; x < WIDTH; x += 42) {
          ctx.beginPath();
          ctx.moveTo(x + ((frameRef.current * lane.dir) % 42), y + CELL * 0.35);
          ctx.quadraticCurveTo(x + 10, y + CELL * 0.25, x + 20, y + CELL * 0.35);
          ctx.stroke();
        }
      } else if (lane.type === "road") {
        ctx.fillStyle = "rgba(255,225,134,0.34)";
        for (let x = 8; x < WIDTH; x += 64) ctx.fillRect(x, y + CELL / 2 - 1, 30, 2);
      }
      const speedMult = 0.5 + levelRef.current * 0.15;
      for (const o of laneObstacles(lane, frameRef.current, speedMult)) {
        if (lane.type === "river") {
          const log = ctx.createLinearGradient(o.x, y, o.x, y + CELL);
          log.addColorStop(0, "#b07943");
          log.addColorStop(0.5, "#704421");
          log.addColorStop(1, "#3b2415");
          ctx.fillStyle = log;
          ctx.beginPath();
          ctx.roundRect(o.x, y + 7, o.width, CELL - 14, 9);
          ctx.fill();
          ctx.strokeStyle = "rgba(46,24,10,0.55)";
          for (let lx = o.x + 14; lx < o.x + o.width - 5; lx += 25) { ctx.beginPath(); ctx.moveTo(lx, y + 9); ctx.lineTo(lx - 4, y + CELL - 9); ctx.stroke(); }
        } else {
          const car = ctx.createLinearGradient(o.x, y, o.x, y + CELL);
          car.addColorStop(0, "#ff8b72");
          car.addColorStop(0.55, "#c94e47");
          car.addColorStop(1, "#6f2427");
          ctx.fillStyle = car;
          ctx.beginPath();
          ctx.roundRect(o.x, y + 6, o.width, CELL - 12, 7);
          ctx.fill();
          ctx.fillStyle = "#9bd4e7";
          ctx.fillRect(o.x + o.width * 0.25, y + 8, o.width * 0.35, 7);
          ctx.fillStyle = "#11151b";
          ctx.fillRect(o.x + 7, y + 3, 9, 5);
          ctx.fillRect(o.x + o.width - 16, y + 3, 9, 5);
          ctx.fillRect(o.x + 7, y + CELL - 8, 9, 5);
          ctx.fillRect(o.x + o.width - 16, y + CELL - 8, 9, 5);
        }
      }
    }

    for (const h of homesFilledRef.current) {
      ctx.fillStyle = "#4a9d6e";
      ctx.fillRect(h * (WIDTH / HOMES_PER_LEVEL) + 6, 6, WIDTH / HOMES_PER_LEVEL - 12, CELL - 12);
    }

    const frog = frogRef.current;
    const frogY = frog.row * CELL;
    ctx.save();
    ctx.shadowColor = "#8fe36a";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#76cf59";
    ctx.beginPath();
    ctx.ellipse(frog.x + CELL / 2, frogY + CELL / 2 + 2, CELL * 0.3, CELL * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9af07a";
    for (const ex of [frog.x + CELL * 0.34, frog.x + CELL * 0.66]) { ctx.beginPath(); ctx.arc(ex, frogY + CELL * 0.31, CELL * 0.105, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#142018";
    for (const ex of [frog.x + CELL * 0.34, frog.x + CELL * 0.66]) { ctx.beginPath(); ctx.arc(ex, frogY + CELL * 0.29, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "#69b74f";
    ctx.lineWidth = 4;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(frog.x + CELL / 2 + side * 7, frogY + CELL * 0.58); ctx.lineTo(frog.x + CELL / 2 + side * 14, frogY + CELL * 0.73); ctx.stroke(); }
    ctx.restore();
  }, []);

  const respawn = useCallback(() => {
    frogRef.current = { x: Math.floor(COLS / 2) * CELL, row: ROWS - 1 };
  }, []);

  const die = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    playArcadeSound("wrong");
    if (livesRef.current <= 0) {
      setOver(true);
      setRunning(false);
      playArcadeSound("gameOver");
      submit(scoreRef.current);
    } else {
      respawn();
    }
  }, [respawn, submit]);

  const reset = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    homesFilledRef.current = new Set();
    frameRef.current = 0;
    respawn();
    setScore(0);
    setLives(3);
    setLevel(1);
    setOver(false);
    setRunning(true);
    draw();
  }, [draw, respawn]);

  const tick = useCallback(() => {
    frameRef.current++;
    const frog = frogRef.current;
    const lane = laneAt(frog.row);
    const speedMult = 0.5 + levelRef.current * 0.15;

    if (lane.type === "road") {
      const hit = laneObstacles(lane, frameRef.current, speedMult).some((o) => overlaps(frog.x, CELL, o.x, o.width));
      if (hit) {
        die();
        draw();
        return;
      }
    } else if (lane.type === "river") {
      const onLog = laneObstacles(lane, frameRef.current, speedMult).find((o) => overlaps(frog.x, CELL, o.x, o.width));
      if (!onLog) {
        die();
        draw();
        return;
      }
      frog.x += lane.speed * speedMult * lane.dir;
      if (frog.x < -CELL || frog.x > WIDTH) {
        die();
        draw();
        return;
      }
    } else if (lane.type === "goal") {
      const homeIdx = Math.min(HOMES_PER_LEVEL - 1, Math.floor((frog.x + CELL / 2) / (WIDTH / HOMES_PER_LEVEL)));
      if (homesFilledRef.current.has(homeIdx)) {
        die();
        draw();
        return;
      }
      homesFilledRef.current.add(homeIdx);
      scoreRef.current += 100;
      setScore(scoreRef.current);
      playArcadeSound("win");
      if (homesFilledRef.current.size >= HOMES_PER_LEVEL) {
        homesFilledRef.current = new Set();
        levelRef.current += 1;
        setLevel(levelRef.current);
        playArcadeSound("levelUp");
      }
      respawn();
    }

    draw();
  }, [die, draw, respawn]);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      const frog = frogRef.current;
      if (e.key === "ArrowUp" && frog.row > 0) {
        frog.row -= 1;
        scoreRef.current += 10;
        setScore(scoreRef.current);
        playArcadeSound("click");
      } else if (e.key === "ArrowDown" && frog.row < ROWS - 1) frog.row += 1;
      else if (e.key === "ArrowLeft") frog.x = Math.max(0, frog.x - CELL);
      else if (e.key === "ArrowRight") frog.x = Math.min(WIDTH - CELL, frog.x + CELL);
      else return;
      draw();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, draw]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        <span className="chip">Level: {level}</span>
        <span className="chip">Lives: {"❤️".repeat(Math.max(0, lives))}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>
      <div className="relative overflow-hidden rounded-xl" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <p className="text-xl font-bold text-white">Game over</p>
            <button className="btn btn-primary" onClick={reset}>
              Play again
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Arrow keys to hop — ride logs across the river, dodge cars on the road.</p>
    </div>
  );
}
