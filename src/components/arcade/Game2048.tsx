"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { useSettings } from "@/lib/chess/useSettings";
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
  4096: { bg: "#b06fe0", fg: "#fff" },
  8192: { bg: "#e0507a", fg: "#fff" },
};

function makeInitial(): Board2048 {
  let b = emptyBoard2048();
  b = spawnTile(b);
  b = spawnTile(b);
  return b;
}

interface Confetto {
  id: number;
  x: number;
  color: string;
  delay: number;
}

export function Game2048() {
  const { best, submit } = useHighScore("2048");
  const { settings } = useSettings();
  const [board, setBoard] = useState<Board2048>(() => makeInitial());
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [continued, setContinued] = useState(false);
  const [popup, setPopup] = useState<{ text: string; id: number } | null>(null);
  const [newCell, setNewCell] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<Confetto[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const scoreRef = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<{ board: Board2048; score: number } | null>(null);
  const popupSeq = useRef(0);

  const reset = useCallback(() => {
    setBoard(makeInitial());
    setScore(0);
    scoreRef.current = 0;
    setOver(false);
    setWon(false);
    setContinued(false);
    setCanUndo(false);
    historyRef.current = null;
  }, []);

  const fireConfetti = useCallback(() => {
    if (settings.celebrationIntensity === "off") return;
    const colors = ["#e9a23b", "#5bbf7a", "#5aa8e0", "#e5604d", "#b06fe0", "#e0c030"];
    const particleCount = settings.celebrationIntensity === "full" ? 54 : 18;
    setConfetti(
      Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[i % colors.length],
        delay: Math.random() * 0.3,
      })),
    );
    setTimeout(() => setConfetti([]), 1400);
  }, [settings.celebrationIntensity]);

  const applyMove = useCallback(
    (dir: Dir2048) => {
      if (over || (won && !continued)) return;
      setBoard((prev) => {
        const { board: moved, gained, moved: didMove } = move2048(prev, dir);
        if (!didMove) return prev;
        historyRef.current = { board: prev, score: scoreRef.current };
        setCanUndo(true);
        const withSpawn = spawnTile(moved);
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (withSpawn[r][c] !== 0 && moved[r][c] === 0) setNewCell(`${r}-${c}`);
          }
        }
        playArcadeSound("merge");
        scoreRef.current += gained;
        setScore(scoreRef.current);
        if (gained > 0) {
          popupSeq.current += 1;
          setPopup({ text: `+${gained}`, id: popupSeq.current });
          setTimeout(() => setPopup((p) => (p?.id === popupSeq.current ? null : p)), 600);
        }
        const isNewBest = best === null || scoreRef.current > best;
        if (!won && hasTile2048(withSpawn, 2048)) {
          setWon(true);
          playArcadeSound("win");
          fireConfetti();
        }
        if (!canMove2048(withSpawn)) {
          setOver(true);
          playArcadeSound("gameOver");
          if (isNewBest) fireConfetti();
          submit(scoreRef.current);
        }
        return withSpawn;
      });
    },
    [over, won, continued, submit, best, fireConfetti],
  );

  const undo = useCallback(() => {
    if (!historyRef.current) return;
    setBoard(historyRef.current.board);
    scoreRef.current = historyRef.current.score;
    setScore(historyRef.current.score);
    setOver(false);
    setCanUndo(false);
    historyRef.current = null;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir2048> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        applyMove(dir);
        return;
      }
      if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyMove, undo]);

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
        <span className="chip relative">
          Score: {score}
          {popup && (
            <span
              key={popup.id}
              className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-[var(--good)]"
              style={{ animation: "g2048-float 0.6s ease-out forwards" }}
            >
              {popup.text}
            </span>
          )}
        </span>
        <button className="btn btn-ghost !py-1 text-xs" onClick={undo} disabled={!canUndo}>
          Undo
        </button>
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
            const key = `${r}-${c}`;
            const isNew = newCell === key;
            return (
              <div
                key={key}
                className="flex items-center justify-center rounded-lg text-2xl font-black transition-all"
                style={{
                  background: v ? colors.bg : "var(--bg-elev-2)",
                  color: colors.fg,
                  boxShadow: v ? "inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.12)" : undefined,
                  animation: isNew ? "g2048-pop 0.18s ease-out" : undefined,
                }}
                onAnimationEnd={() => isNew && setNewCell(null)}
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
        {confetti.map((c) => (
          <span
            key={c.id}
            className="pointer-events-none absolute top-0 h-2 w-2 rounded-sm"
            style={{
              left: `${c.x}%`,
              background: c.color,
              animation: `g2048-confetti 1.2s ${c.delay}s ease-in forwards`,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Arrow keys, or swipe on mobile. ⌘/Ctrl+Z to undo.</p>
      <style>{`
        @keyframes g2048-pop {
          0% { transform: scale(0.5); opacity: 0.4; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes g2048-float {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -18px); }
        }
        @keyframes g2048-confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(340px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
