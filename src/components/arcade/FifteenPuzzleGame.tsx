"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { shuffledBoard, slide, isSolved, type FpBoard } from "@/lib/arcade/fifteenPuzzle";

export function FifteenPuzzleGame() {
  const { best, submit } = useHighScore("15puzzle", { higherIsBetter: false });
  // Dealt client-side only: shuffledBoard() uses Math.random(), so computing
  // it in useState's initializer would run during SSR too and mismatch
  // against the client's own reshuffle at hydration time.
  const [board, setBoard] = useState<FpBoard | null>(null);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const startRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setBoard(shuffledBoard());
    setMoves(0);
    setElapsed(0);
    setWon(false);
    setStarted(false);
    startRef.current = null;
  }, []);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (won || !started) return;
    const t = window.setInterval(() => {
      if (startRef.current != null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [won, started]);

  if (!board) return <p className="p-8 text-center text-sm text-[var(--text-faint)]">Shuffling…</p>;

  const handleTileClick = (idx: number) => {
    if (won) return;
    const next = slide(board, idx);
    if (!next) return;
    if (startRef.current == null) {
      startRef.current = Date.now();
      setStarted(true);
    }
    setBoard(next);
    setMoves((m) => m + 1);
    playArcadeSound("click");
    if (isSolved(next)) {
      setWon(true);
      playArcadeSound("win");
      if (startRef.current != null) submit(Math.floor((Date.now() - startRef.current) / 1000));
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Moves: {moves}</span>
        <span className="chip">⏱ {elapsed}s</span>
        <button className="btn !py-1 text-xs" onClick={reset}>
          Shuffle
        </button>
        {best != null && <span className="chip">Best: {best}s</span>}
      </div>

      <div className="relative w-full max-w-sm rounded-2xl bg-[var(--bg-elev)] p-2" style={{ aspectRatio: "1/1" }}>
        {board.map((value, idx) => {
          if (value === 0) return null;
          const col = idx % 4;
          const row = Math.floor(idx / 4);
          return (
            <button
              key={value}
              onClick={() => handleTileClick(idx)}
              className="absolute flex items-center justify-center rounded-lg text-xl font-black transition-transform duration-150 ease-out"
              style={{
                width: "calc(25% - 6px)",
                height: "calc(25% - 6px)",
                top: 3,
                left: 3,
                transform: `translate(calc(${col} * (100% + 8px)), calc(${row} * (100% + 8px)))`,
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.12)",
              }}
            >
              {value}
            </button>
          );
        })}
      </div>

      {won && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel w-full max-w-sm p-6 text-center">
            <p className="text-xl font-bold">Solved!</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {moves} moves · {elapsed}s
            </p>
            <button className="btn btn-primary mt-4" onClick={reset}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
