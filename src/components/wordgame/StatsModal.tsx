"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDist: number[];
}

export function StatsModal({
  open,
  onClose,
  done,
  won,
  answer,
}: {
  open: boolean;
  onClose: () => void;
  done: boolean;
  won: boolean;
  answer: string;
}) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!session?.user) {
      setStats(null);
      return;
    }
    fetch("/api/wordgame/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [open, session]);

  if (!open) return null;
  const winPct = stats && stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxDist = stats ? Math.max(1, ...stats.guessDist) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade" onClick={onClose}>
      <div className="panel w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-center text-xl font-bold">Statistics</h2>

        {done && (
          <p className="mb-4 text-center text-sm">
            {won ? "🎉 Solved it!" : `The word was `}
            {!won && <span className="font-bold uppercase text-[var(--accent)]">{answer}</span>}
          </p>
        )}

        {!session?.user ? (
          <p className="text-center text-sm text-[var(--text-muted)]">Sign in to track streaks and stats across devices.</p>
        ) : !stats ? (
          <p className="text-center text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-4 gap-2 text-center">
              <Stat label="Played" value={stats.played} />
              <Stat label="Win %" value={winPct} />
              <Stat label="Streak" value={stats.currentStreak} />
              <Stat label="Best" value={stats.maxStreak} />
            </div>
            <span className="label mb-2 block">Guess distribution</span>
            <div className="flex flex-col gap-1">
              {stats.guessDist.map((count, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-3">{i + 1}</span>
                  <div className="flex-1 rounded bg-[var(--bg-elev)]">
                    <div
                      className="rounded bg-[var(--accent)] px-1.5 text-right font-bold text-[var(--accent-contrast)]"
                      style={{ width: `${Math.max(8, (count / maxDist) * 100)}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn mt-5 w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-black">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
