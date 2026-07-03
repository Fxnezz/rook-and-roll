"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
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

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);

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
    ctx.fillStyle = PIECE_COLORS[type];
    for (const c of cells) {
      ctx.fillRect((c.x - minX) * 16 + 8, (c.y - minY) * 16 + 8, 14, 14);
    }
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0e1117";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    // settled grid
    const grid = gridRef.current;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = grid[y][x];
        if (t) {
          ctx.fillStyle = PIECE_COLORS[t];
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }
    const cur = currentRef.current;
    if (cur) {
      const ghost = ghostPiece(grid, cur);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (const c of pieceCells(ghost)) {
        if (c.y >= 0) ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2);
      }
      ctx.fillStyle = PIECE_COLORS[cur.type];
      for (const c of pieceCells(cur)) {
        if (c.y >= 0) ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2);
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
    setScore(0);
    setLines(0);
    setLevel(1);
    setOver(false);
    lastDropRef.current = 0;
    spawnNext();
    draw();
  }, [spawnNext, draw]);

  const lockAndClear = useCallback(() => {
    if (!currentRef.current) return;
    gridRef.current = lockPiece(gridRef.current, currentRef.current);
    const { grid, cleared } = clearLines(gridRef.current);
    gridRef.current = grid;
    if (cleared > 0) {
      linesRef.current += cleared;
      scoreRef.current += scoreForLines(cleared, levelRef.current);
      levelRef.current = levelForLines(linesRef.current);
      setLines(linesRef.current);
      setScore(scoreRef.current);
      setLevel(levelRef.current);
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
    draw();
  }, [draw, lockAndClear]);

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

  useEffect(() => {
    if (!running) return;
    const loop = (t: number) => {
      if (t - lastDropRef.current >= dropIntervalMs(levelRef.current)) {
        lastDropRef.current = t;
        softDrop();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, softDrop]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "c", "z", "x"].includes(e.key)) e.preventDefault();
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
  }, [running, shift, softDrop, rotate, hardDrop, hold]);

  const start = () => {
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
      </div>

      <div className="relative">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="rounded-lg" style={{ maxWidth: "80vw" }} />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/70">
            <p className="text-lg font-bold text-white">{over ? "Game over" : "Tetris"}</p>
            {over && <p className="text-sm text-white/80">Score: {score}</p>}
            <button className="btn btn-primary" onClick={start}>
              {over ? "Play again" : "Start"}
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
          ←→ move · ↑/x rotate · z rotate CCW · ↓ soft drop · space hard drop · c hold
        </p>
      </div>
    </div>
  );
}
