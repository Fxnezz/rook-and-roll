"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PuzzlePlayer, type PuzzleOutcome } from "@/components/puzzles/PuzzlePlayer";
import {
  PUZZLES,
  dailyPuzzle,
  nextPuzzle,
  puzzleElo,
  loadProgress,
  saveProgress,
  type DifficultyFilter,
} from "@/lib/puzzles";
import type { PuzzleDef, PuzzleProgress } from "@/lib/puzzles/types";
import { DEFAULT_PUZZLE_PROGRESS } from "@/lib/puzzles/types";

type Mode = "practice" | "daily" | "rush";
const RUSH_DURATION_MS = 180_000;

interface HistoryEntry {
  id: string;
  puzzleId: string;
  solved: boolean;
  ratingBefore: number;
  ratingAfter: number;
  createdAt: string;
  puzzleRating: number;
  themes: string[];
}

export default function PuzzlesPage() {
  const { data: session } = useSession();
  const [progress, setProgress] = useState<PuzzleProgress>(DEFAULT_PUZZLE_PROGRESS);
  const [mode, setMode] = useState<Mode>("practice");
  const [puzzle, setPuzzle] = useState<PuzzleDef | null>(null);
  const [solvedThis, setSolvedThis] = useState(false);
  const [ratingFlash, setRatingFlash] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("auto");

  const [rushActive, setRushActive] = useState(false);
  const [rushMsLeft, setRushMsLeft] = useState(RUSH_DURATION_MS);
  const [rushSolved, setRushSolved] = useState(0);
  const [rushResult, setRushResult] = useState<number | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  const daily = useMemo(() => dailyPuzzle(), []);

  // hydrate progress + first puzzle client-side
  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setPuzzle(nextPuzzle(p));
    setHydrated(true);
  }, []);

  // Rush countdown
  useEffect(() => {
    if (!rushActive) return;
    const iv = setInterval(() => {
      setRushMsLeft((ms) => {
        if (ms <= 1000) {
          clearInterval(iv);
          setRushActive(false);
          setRushResult(rushSolved);
          return 0;
        }
        return ms - 1000;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rushActive]);

  const startRush = useCallback(() => {
    setRushSolved(0);
    setRushMsLeft(RUSH_DURATION_MS);
    setRushResult(null);
    setRushActive(true);
    setSolvedThis(false);
    setRatingFlash(null);
    setPuzzle(nextPuzzle(progress, undefined, difficulty));
  }, [progress, difficulty]);

  const loadHistory = useCallback(() => {
    setShowHistory((v) => !v);
    if (history || !session?.user) return;
    fetch("/api/puzzles/history")
      .then((r) => r.json())
      .then((d) => setHistory(d.attempts ?? []))
      .catch(() => setHistory([]));
  }, [history, session]);

  const persist = useCallback(
    (p: PuzzleProgress, puzzleId: string, solved: boolean, ratingBefore: number) => {
      setProgress(p);
      saveProgress(p);
      if (session?.user) {
        fetch("/api/puzzles/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleId,
            solved,
            ratingBefore,
            ratingAfter: p.rating,
            streak: p.streak,
          }),
        }).catch(() => {});
      }
    },
    [session],
  );

  const onComplete = useCallback(
    (outcome: PuzzleOutcome) => {
      if (!puzzle) return;
      setSolvedThis(true);
      // A clean solve counts fully; a solve after a wrong try keeps the streak
      // but gains no rating (the miss already cost rating in onFirstMistake).
      let nextProgress: PuzzleProgress;
      if (outcome === "solved") {
        const before = progress.rating;
        const rating = puzzleElo(progress, puzzle, true);
        const streak = progress.streak + 1;
        nextProgress = {
          ...progress,
          rating,
          streak,
          bestStreak: Math.max(progress.bestStreak, streak),
          solved: [...new Set([...progress.solved, puzzle.id])],
          attempts: progress.attempts + 1,
        };
        setRatingFlash(rating - before);
        persist(nextProgress, puzzle.id, true, before);
      } else {
        nextProgress = {
          ...progress,
          solved: [...new Set([...progress.solved, puzzle.id])],
        };
        persist(nextProgress, puzzle.id, true, progress.rating);
      }

      if (rushActive) {
        setRushSolved((n) => n + 1);
        setTimeout(() => {
          setSolvedThis(false);
          setPuzzle(nextPuzzle(nextProgress, puzzle.id, difficulty));
        }, 500);
      }
    },
    [puzzle, progress, persist, rushActive, difficulty],
  );

  const onFirstMistake = useCallback(() => {
    if (!puzzle) return;
    const before = progress.rating;
    const rating = puzzleElo(progress, puzzle, false);
    const p: PuzzleProgress = {
      ...progress,
      rating,
      streak: 0,
      attempts: progress.attempts + 1,
    };
    setRatingFlash(rating - before);
    persist(p, puzzle.id, false, before);
  }, [puzzle, progress, persist]);

  const advance = useCallback(() => {
    setSolvedThis(false);
    setRatingFlash(null);
    setPuzzle(nextPuzzle(progress, puzzle?.id, difficulty));
  }, [progress, puzzle, difficulty]);

  const active = mode === "daily" ? daily : puzzle;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold leading-tight">Puzzles</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {PUZZLES.length} machine-verified tactics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Stat label="Rating" value={hydrated ? progress.rating : "—"} flash={ratingFlash} />
          <Stat label="Streak" value={hydrated ? `${progress.streak}🔥` : "—"} />
          <Stat label="Best" value={hydrated ? progress.bestStreak : "—"} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-[var(--bg-elev)] p-1" style={{ width: "fit-content" }}>
          {(["practice", "daily", "rush"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setSolvedThis(false);
                setRatingFlash(null);
                setRushActive(false);
                setRushResult(null);
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                mode === m ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-muted)]"
              }`}
            >
              {m === "daily" ? "Daily puzzle" : m === "rush" ? "Puzzle Rush" : "Practice"}
            </button>
          ))}
        </div>
        {session?.user && (
          <button className="btn btn-ghost !py-1.5 text-sm" onClick={loadHistory}>
            {showHistory ? "Hide history" : "History"}
          </button>
        )}
      </div>

      {showHistory && (
        <div className="panel mb-4 max-h-64 overflow-y-auto p-4">
          <span className="label">Recent attempts</span>
          {history === null ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Loading…</p>
          ) : history.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">No recorded attempts yet.</p>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-[var(--border)]">
              {history.map((h) => {
                const delta = h.ratingAfter - h.ratingBefore;
                return (
                  <div key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className={h.solved ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                      {h.solved ? "Solved" : "Missed"}
                    </span>
                    <span className="text-xs text-[var(--text-faint)]">{h.puzzleRating} rated</span>
                    <span className="text-xs text-[var(--text-faint)]">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`text-xs font-semibold ${delta >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                      {delta >= 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="w-full lg:max-w-[min(70vh,600px)]">
          {mode === "rush" && !rushActive && rushResult === null ? (
            <div className="panel flex aspect-square flex-col items-center justify-center gap-4 p-6 text-center">
              <h2 className="text-xl font-bold">Puzzle Rush</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Solve as many puzzles as you can in 3 minutes. Mistakes cost rating but won&apos;t end your run.
              </p>
              <button className="btn btn-primary" onClick={startRush}>
                Start Rush
              </button>
            </div>
          ) : mode === "rush" && rushResult !== null ? (
            <div className="panel flex aspect-square flex-col items-center justify-center gap-3 p-6 text-center">
              <h2 className="text-xl font-bold">Time&apos;s up!</h2>
              <p className="text-3xl font-black text-[var(--accent)]">{rushResult}</p>
              <p className="text-sm text-[var(--text-muted)]">puzzles solved</p>
              <button className="btn btn-primary mt-2" onClick={startRush}>
                Play again
              </button>
            </div>
          ) : active ? (
            <PuzzlePlayer
              key={mode + active.id}
              puzzle={active}
              onComplete={onComplete}
              onFirstMistake={onFirstMistake}
            />
          ) : (
            <div className="panel flex aspect-square items-center justify-center text-[var(--text-muted)]">
              Loading puzzle…
            </div>
          )}
        </div>

        <div className="panel w-full p-4 lg:w-[300px]">
          {mode === "rush" && rushActive && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-2xl font-black tabular-nums">
                {Math.floor(rushMsLeft / 60000)}:{String(Math.floor((rushMsLeft % 60000) / 1000)).padStart(2, "0")}
              </span>
              <span className="chip">{rushSolved} solved</span>
            </div>
          )}
          {mode !== "daily" && (
            <>
              <span className="label">Difficulty</span>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {(["auto", "easy", "medium", "hard"] as DifficultyFilter[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDifficulty(d);
                      if (mode === "practice") setPuzzle(nextPuzzle(progress, puzzle?.id, d));
                    }}
                    className="hover-lift rounded-md border px-1.5 py-1.5 text-xs font-medium capitalize transition-colors"
                    style={{
                      borderColor: difficulty === d ? "var(--accent)" : "var(--border)",
                      background: difficulty === d ? "var(--bg-elev-2)" : "transparent",
                      color: difficulty === d ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
          {active && (
            <>
              <span className="label mt-4 block">This puzzle</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">{active.rating}</span>
                {active.themes.map((t) => (
                  <span key={t} className="chip capitalize">
                    {t.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </span>
                ))}
              </div>
            </>
          )}
          {solvedThis && !rushActive && (
            <button className="btn btn-primary mt-4 w-full" onClick={advance}>
              Next puzzle →
            </button>
          )}
          {mode === "daily" && (
            <p className="mt-4 text-xs text-[var(--text-faint)]">
              Everyone gets the same daily puzzle. A new one arrives at midnight UTC.
            </p>
          )}
          {!session?.user && hydrated && (
            <p className="mt-4 text-xs text-[var(--text-faint)]">
              Progress is saved on this device. Sign in to keep your puzzle rating across devices.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, flash }: { label: string; value: string | number; flash?: number | null }) {
  return (
    <div className="panel relative px-3 py-1.5 text-center">
      <div className="text-lg font-black leading-tight">{value}</div>
      <div className="label">{label}</div>
      {flash != null && flash !== 0 && (
        <span
          className="absolute -right-1 -top-2 text-xs font-bold animate-fade"
          style={{ color: flash > 0 ? "var(--good)" : "var(--bad)" }}
        >
          {flash > 0 ? `+${flash}` : flash}
        </span>
      )}
    </div>
  );
}
