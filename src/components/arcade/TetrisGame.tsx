"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import {
  COLS,
  ROWS,
  PIECE_COLORS,
  emptyGrid,
  spawnPiece,
  collides,
  tryRotate,
  lockPiece,
  clearLines,
  pieceCells,
  newBag,
  scoreForLines,
  levelForLines,
  dropIntervalMs,
  ghostPiece,
  type ActivePiece,
  type Grid,
  type PieceType,
} from "@/lib/arcade/tetris";

const CELL = 24;

function blockGradient(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, lighten(color, 0.35));
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, lighten(color, -0.25));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  r = adj(r);
  g = adj(g);
  b = adj(b);
  return `rgb(${r},${g},${b})`;
}

export function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const { best, submit } = useHighScore("tetris");

  const gridRef = useRef<Grid>(emptyGrid());
  const bagRef = useRef<PieceType[]>([]);
  const currentRef = useRef<ActivePiece | null>(null);
  const holdRef = useRef<PieceType | null>(null);
  const canHoldRef = useRef(true);
  const linesRef = useRef(0);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const lastDropRef = useRef(0);
  const rafRef = useRef<number>(0);
  const comboRef = useRef(0);
  const flashRef = useRef<{ rows: number[]; until: number }>({ rows: [], until: 0 });
  const pausedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [combo, setCombo] = useState(0);

  const nextFromBag = useCallback((): PieceType => {
    if (bagRef.current.length === 0) bagRef.current = newBag();
    return bagRef.current.shift()!;
  }, []);

  const drawMini = useCallback((canvas: HTMLCanvasElement | null, type: PieceType | null) => {
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#161b24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!type) return;
    const p = spawnPiece(type);
    const cells = pieceCells({ ...p, ox: 0, oy: type === "I" ? 0 : 0 });
    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    for (const c of cells) {
      blockGradient(ctx, (c.x - minX) * 16 + 8, (c.y - minY) * 16 + 8, 14, PIECE_COLORS[type]);
    }
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0e1117";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(COLS * CELL, y * CELL);
      ctx.stroke();
    }

    const grid = gridRef.current;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = grid[y][x];
        if (t) blockGradient(ctx, x * CELL + 1, y * CELL + 1, CELL - 2, PIECE_COLORS[t]);
      }
    }

    const cur = currentRef.current;
    if (cur) {
      const ghost = ghostPiece(grid, cur);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (const c of pieceCells(ghost)) {
        if (c.y >= 0) ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2);
      }
      for (const c of pieceCells(cur)) {
        if (c.y >= 0) blockGradient(ctx, c.x * CELL + 1, c.y * CELL + 1, CELL - 2, PIECE_COLORS[cur.type]);
      }
    }

    if (performance.now() < flashRef.current.until) {
      const t = (flashRef.current.until - performance.now()) / 150;
      ctx.fillStyle = `rgba(255,255,255,${0.75 * t})`;
      for (const row of flashRef.current.rows) {
        ctx.fillRect(0, row * CELL, COLS * CELL, CELL);
      }
    }

    drawMini(holdCanvasRef.current, holdRef.current);
    drawMini(nextCanvasRef.current, bagRef.current[0] ?? null);
  }, [drawMini]);

  const spawnNext = useCallback(() => {
    const type = nextFromBag();
    if (bagRef.current.length === 0) bagRef.current = newBag();
    const p = spawnPiece(type);
    if (collides(gridRef.current, p)) {
      setOver(true);
      setRunning(false);
      playArcadeSound("gameOver");
      submit(scoreRef.current);
      return;
    }
    currentRef.current = p;
    canHoldRef.current = true;
  }, [nextFromBag, submit]);

  const reset = useCallback(() => {
    gridRef.current = emptyGrid();
    bagRef.current = newBag();
    holdRef.current = null;
    canHoldRef.current = true;
    linesRef.current = 0;
    scoreRef.current = 0;
    levelRef.current = 1;
    comboRef.current = 0;
    setScore(0);
    setLines(0);
    setLevel(1);
    setCombo(0);
    setOver(false);
    setPaused(false);
    pausedRef.current = false;
    lastDropRef.current = 0;
    spawnNext();
    draw();
  }, [spawnNext, draw]);

  const lockAndClear = useCallback(() => {
    if (!currentRef.current) return;
    gridRef.current = lockPiece(gridRef.current, currentRef.current);
    const fullRows: number[] = [];
    gridRef.current.forEach((row, i) => {
      if (row.every((c) => c !== null)) fullRows.push(i);
    });
    const prevLevel = levelRef.current;
    const { grid, cleared } = clearLines(gridRef.current);
    gridRef.current = grid;
    if (cleared > 0) {
      flashRef.current = { rows: fullRows, until: performance.now() + 150 };
      linesRef.current += cleared;
      scoreRef.current += scoreForLines(cleared, levelRef.current);
      levelRef.current = levelForLines(linesRef.current);
      comboRef.current += 1;
      setLines(linesRef.current);
      setScore(scoreRef.current);
      setLevel(levelRef.current);
      setCombo(comboRef.current);
      playArcadeSound(cleared >= 4 ? "tetrisClear" : "lineClear");
      if (levelRef.current > prevLevel) playArcadeSound("levelUp");
    } else {
      comboRef.current = 0;
      setCombo(0);
    }
    currentRef.current = null;
    spawnNext();
  }, [spawnNext]);

  const softDrop = useCallback(() => {
    const p = currentRef.current;
    if (!p) return;
    const moved = { ...p, oy: p.oy + 1 };
    if (!collides(gridRef.current, moved)) {
      currentRef.current = moved;
    } else {
      lockAndClear();
    }
  }, [lockAndClear]);

  const hardDrop = useCallback(() => {
    const p = currentRef.current;
    if (!p) return;
    currentRef.current = ghostPiece(gridRef.current, p);
    lockAndClear();
    draw();
  }, [draw, lockAndClear]);

  const shift = useCallback(
    (dx: number) => {
      const p = currentRef.current;
      if (!p) return;
      const moved = { ...p, ox: p.ox + dx };
      if (!collides(gridRef.current, moved)) {
        currentRef.current = moved;
        draw();
      }
    },
    [draw],
  );

  const rotate = useCallback(
    (dir: 1 | -1) => {
      const p = currentRef.current;
      if (!p) return;
      const r = tryRotate(gridRef.current, p, dir);
      if (r) {
        currentRef.current = r;
        draw();
      }
    },
    [draw],
  );

  const hold = useCallback(() => {
    const p = currentRef.current;
    if (!p || !canHoldRef.current) return;
    const prevHold = holdRef.current;
    holdRef.current = p.type;
    canHoldRef.current = false;
    if (prevHold) {
      const np = spawnPiece(prevHold);
      currentRef.current = np;
    } else {
      spawnNext();
    }
    draw();
  }, [spawnNext, draw]);

  const togglePause = useCallback(() => {
    if (!running || over) return;
    setPaused((p) => {
      pausedRef.current = !p;
      return !p;
    });
  }, [running, over]);

  useEffect(() => {
    if (!running) return;
    const loop = (t: number) => {
      if (!pausedRef.current && t - lastDropRef.current >= dropIntervalMs(levelRef.current)) {
        lastDropRef.current = t;
        softDrop();
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, softDrop, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "c", "z", "x", "p"].includes(e.key)) e.preventDefault();
      if (e.key === "p") return togglePause();
      if (pausedRef.current) return;
      if (e.key === "ArrowLeft") shift(-1);
      else if (e.key === "ArrowRight") shift(1);
      else if (e.key === "ArrowDown") softDrop();
      else if (e.key === "ArrowUp" || e.key === "x") rotate(1);
      else if (e.key === "z") rotate(-1);
      else if (e.key === " ") hardDrop();
      else if (e.key === "c") hold();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, shift, softDrop, rotate, hardDrop, hold, togglePause]);

  const start = () => {
    if (paused) {
      togglePause();
      return;
    }
    if (over) reset();
    else if (!currentRef.current) reset();
    setRunning(true);
  };

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center">
      <div className="flex gap-2 sm:flex-col">
        <div className="panel p-2 text-center">
          <span className="label">Hold</span>
          <canvas ref={holdCanvasRef} width={64} height={64} className="rounded bg-[var(--bg)]" />
        </div>
        <div className="panel p-2 text-center">
          <span className="label">Next</span>
          <canvas ref={nextCanvasRef} width={64} height={64} className="rounded bg-[var(--bg)]" />
        </div>
        {running && !over && (
          <button className="btn btn-ghost !py-1 text-xs" onClick={togglePause}>
            {paused ? "Resume" : "Pause"}
          </button>
        )}
      </div>

      <div className="relative">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="rounded-lg" style={{ maxWidth: "80vw" }} />
        {combo > 1 && running && !over && !paused && (
          <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs font-bold text-[var(--accent)]">
            Combo ×{combo}
          </div>
        )}
        {(!running || paused) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/70">
            <p className="text-lg font-bold text-white">{over ? "Game over" : paused ? "Paused" : "Tetris"}</p>
            {over && <p className="text-sm text-white/80">Score: {score}</p>}
            <button className="btn btn-primary" onClick={start}>
              {paused ? "Resume" : over ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:w-32">
        <div className="panel p-2 text-center">
          <div className="text-lg font-black">{score}</div>
          <div className="label">Score</div>
        </div>
        {best != null && (
          <div className="panel p-2 text-center">
            <div className="text-lg font-black">{best}</div>
            <div className="label">Best</div>
          </div>
        )}
        <div className="panel p-2 text-center">
          <div className="text-lg font-black">{level}</div>
          <div className="label">Level</div>
        </div>
        <div className="panel p-2 text-center">
          <div className="text-lg font-black">{lines}</div>
          <div className="label">Lines</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 sm:hidden">
          <button className="btn !p-2" onClick={() => shift(-1)}>
            ←
          </button>
          <button className="btn !p-2" onClick={() => rotate(1)}>
            ⟳
          </button>
          <button className="btn !p-2" onClick={() => shift(1)}>
            →
          </button>
          <button className="btn !p-2" onClick={softDrop}>
            ↓
          </button>
          <button className="btn !p-2" onClick={hardDrop}>
            ⤓
          </button>
          <button className="btn !p-2" onClick={hold}>
            Hold
          </button>
        </div>
        <p className="hidden text-xs text-[var(--text-faint)] sm:block">
          ←→ move · ↑/x rotate · z rotate CCW · ↓ soft drop · space hard drop · c hold · p pause
        </p>
      </div>
    </div>
  );
}
