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
} from "@/lib/puzzles";
import type { PuzzleDef, PuzzleProgress } from "@/lib/puzzles/types";
import { DEFAULT_PUZZLE_PROGRESS } from "@/lib/puzzles/types";

type Mode = "practice" | "daily";

export default function PuzzlesPage() {
  const { data: session } = useSession();
  const [progress, setProgress] = useState<PuzzleProgress>(DEFAULT_PUZZLE_PROGRESS);
  const [mode, setMode] = useState<Mode>("practice");
  const [puzzle, setPuzzle] = useState<PuzzleDef | null>(null);
  const [solvedThis, setSolvedThis] = useState(false);
  const [ratingFlash, setRatingFlash] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const daily = useMemo(() => dailyPuzzle(), []);

  // hydrate progress + first puzzle client-side
  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setPuzzle(nextPuzzle(p));
    setHydrated(true);
  }, []);

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
      if (outcome === "solved") {
        const before = progress.rating;
        const rating = puzzleElo(progress, puzzle, true);
        const streak = progress.streak + 1;
        const p: PuzzleProgress = {
          ...progress,
          rating,
          streak,
          bestStreak: Math.max(progress.bestStreak, streak),
          solved: [...new Set([...progress.solved, puzzle.id])],
          attempts: progress.attempts + 1,
        };
        setRatingFlash(rating - before);
        persist(p, puzzle.id, true, before);
      } else {
        const p: PuzzleProgress = {
          ...progress,
          solved: [...new Set([...progress.solved, puzzle.id])],
        };
        persist(p, puzzle.id, true, progress.rating);
      }
    },
    [puzzle, progress, persist],
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
    setPuzzle(nextPuzzle(progress, puzzle?.id));
  }, [progress, puzzle]);

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

      <div className="mb-4 flex gap-1 rounded-lg bg-[var(--bg-elev)] p-1" style={{ width: "fit-content" }}>
        {(["practice", "daily"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setSolvedThis(false);
              setRatingFlash(null);
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              mode === m ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-muted)]"
            }`}
          >
            {m === "daily" ? "Daily puzzle" : "Practice"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="w-full lg:max-w-[min(70vh,600px)]">
          {active ? (
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
          {active && (
            <>
              <span className="label">This puzzle</span>
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
          {solvedThis && (
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
