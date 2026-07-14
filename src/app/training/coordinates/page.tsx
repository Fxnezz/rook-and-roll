"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { playSound } from "@/lib/chess/sound";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DURATION_MS = 30_000;
const BEST_KEY = "rr.training.coords.best.v1";

function randomSquare(): string {
  const f = FILES[Math.floor(Math.random() * 8)];
  const r = RANKS[Math.floor(Math.random() * 8)];
  return f + r;
}

export default function CoordinatesTrainerPage() {
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);

  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState<string>("e4");
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [msLeft, setMsLeft] = useState(DURATION_MS);
  const [best, setBest] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ square: string; ok: boolean } | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (raw) setBest(Number(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setMsLeft((ms) => {
        if (ms <= 100) {
          clearInterval(iv);
          setRunning(false);
          return 0;
        }
        return ms - 100;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (running || !startedRef.current) return;
    // Round just ended — persist a new best.
    setBest((b) => {
      const next = b === null || score > b ? score : b;
      try {
        localStorage.setItem(BEST_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = useCallback(() => {
    startedRef.current = true;
    setScore(0);
    setMisses(0);
    setMsLeft(DURATION_MS);
    setTarget(randomSquare());
    setFlash(null);
    setRunning(true);
  }, []);

  const onSquareClick = useCallback(
    (square: string) => {
      if (!running) return;
      const ok = square === target;
      setFlash({ square, ok });
      playSound(ok ? "capture" : "illegal");
      if (ok) {
        setScore((s) => s + 1);
        setTarget(randomSquare());
      } else {
        setMisses((m) => m + 1);
      }
      setTimeout(() => setFlash(null), 180);
    },
    [running, target],
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Coordinates trainer</h1>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Click the named square as fast as you can before time runs out.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="panel px-3 py-1.5 text-center">
          <div className="text-lg font-black leading-tight">{score}</div>
          <div className="label">Correct</div>
        </div>
        <div className="panel px-3 py-1.5 text-center">
          <div className="text-lg font-black leading-tight">{misses}</div>
          <div className="label">Misses</div>
        </div>
        <div className="panel px-3 py-1.5 text-center">
          <div className="text-lg font-black leading-tight">{best ?? "—"}</div>
          <div className="label">Best</div>
        </div>
        <div className="panel ml-auto px-3 py-1.5 text-center">
          <div className="text-lg font-black leading-tight tabular-nums">{Math.ceil(msLeft / 1000)}s</div>
          <div className="label">Time</div>
        </div>
      </div>

      {!running ? (
        <div className="panel flex aspect-square flex-col items-center justify-center gap-4 p-6 text-center">
          {startedRef.current && <p className="text-xl font-bold">Time&apos;s up — {score} correct!</p>}
          <button className="btn btn-primary" onClick={start}>
            {startedRef.current ? "Play again" : "Start"}
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-center text-lg font-semibold">
            Find <span className="rounded bg-[var(--bg-elev-2)] px-2 py-0.5 font-mono text-xl font-black">{target}</span>
          </p>
          <div className="mx-auto grid aspect-square w-full max-w-[500px] grid-cols-8 overflow-hidden rounded-lg">
            {RANKS.slice()
              .reverse()
              .map((r) =>
                FILES.map((f) => {
                  const sq = f + r;
                  const dark = (FILES.indexOf(f) + RANKS.indexOf(r)) % 2 === 0;
                  const isFlash = flash?.square === sq;
                  return (
                    <button
                      key={sq}
                      onClick={() => onSquareClick(sq)}
                      className="relative flex items-center justify-center transition-colors"
                      style={{ background: isFlash ? (flash!.ok ? "var(--good)" : "var(--bad)") : dark ? theme.dark : theme.light }}
                      aria-label={`Square ${sq}`}
                    />
                  );
                }),
              )}
          </div>
        </div>
      )}
    </main>
  );
}
