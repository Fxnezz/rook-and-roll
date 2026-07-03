"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import {
  emptyBoard2048,
  spawnTile,
  move2048,
  canMove2048,
  hasTile2048,
  type Board2048,
  type Dir2048,
} from "@/lib/arcade/game2048";

const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  2: { bg: "#3a3f4a", fg: "#e8ecf3" },
  4: { bg: "#4a4f5c", fg: "#e8ecf3" },
  8: { bg: "#e9a23b", fg: "#241a08" },
  16: { bg: "#e5934a", fg: "#241a08" },
  32: { bg: "#e5843a", fg: "#241a08" },
  64: { bg: "#e5604d", fg: "#fff" },
  128: { bg: "#e0c34a", fg: "#241a08" },
  256: { bg: "#e0c030", fg: "#241a08" },
  512: { bg: "#dcc020", fg: "#241a08" },
  1024: { bg: "#5aa8e0", fg: "#fff" },
  2048: { bg: "#5bbf7a", fg: "#08240f" },
};

function makeInitial(): Board2048 {
  let b = emptyBoard2048();
  b = spawnTile(b);
  b = spawnTile(b);
  return b;
}

export function Game2048() {
  const { best, submit } = useHighScore("2048");
  const [board, setBoard] = useState<Board2048>(() => makeInitial());
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [continued, setContinued] = useState(false);
  const scoreRef = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setBoard(makeInitial());
    setScore(0);
    scoreRef.current = 0;
    setOver(false);
    setWon(false);
    setContinued(false);
  }, []);

  const applyMove = useCallback(
    (dir: Dir2048) => {
      if (over || (won && !continued)) return;
      setBoard((prev) => {
        const { board: moved, gained, moved: didMove } = move2048(prev, dir);
        if (!didMove) return prev;
        const withSpawn = spawnTile(moved);
        scoreRef.current += gained;
        setScore(scoreRef.current);
        if (!won && hasTile2048(withSpawn, 2048)) setWon(true);
        if (!canMove2048(withSpawn)) {
          setOver(true);
          submit(scoreRef.current);
        }
        return withSpawn;
      });
    },
    [over, won, continued, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir2048> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      applyMove(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    const dir: Dir2048 = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    applyMove(dir);
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[420px] items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>
      <div
        className="relative grid w-full max-w-[420px] grid-cols-4 gap-2 rounded-2xl bg-[var(--bg-elev)] p-2"
        style={{ aspectRatio: "1/1" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {board.map((row, r) =>
          row.map((v, c) => {
            const colors = TILE_COLORS[v] ?? { bg: "#5bbf7a22", fg: "var(--text)" };
            return (
              <div
                key={`${r}-${c}`}
                className="flex items-center justify-center rounded-lg text-2xl font-black transition-all"
                style={{ background: v ? colors.bg : "var(--bg-elev-2)", color: colors.fg }}
              >
                {v !== 0 && v}
              </div>
            );
          }),
        )}
        {(over || (won && !continued)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70">
            <p className="text-xl font-bold text-white">{over ? "Game over" : "You reached 2048!"}</p>
            <div className="flex gap-2">
              {won && !over && (
                <button className="btn btn-primary" onClick={() => setContinued(true)}>
                  Keep going
                </button>
              )}
              <button className="btn" onClick={reset}>
                New game
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Arrow keys, or swipe on mobile.</p>
    </div>
  );
}
