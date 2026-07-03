"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface LeaderboardRow {
  username: string | null;
  score: number;
}

const key = (game: string, level?: string) => `rr.highscore.${game}${level ? `.${level}` : ""}`;

/**
 * Personal best for an arcade/racing/platformer game. Signed-in users get
 * their best from Postgres (and every submission is recorded there); guests
 * fall back to localStorage on this device only.
 */
export function useHighScore(game: string, opts: { level?: string; higherIsBetter?: boolean } = {}) {
  const { level, higherIsBetter = true } = opts;
  const { data: session } = useSession();
  const [best, setBest] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (session?.user) {
        try {
          const q = new URLSearchParams({ game, ...(level ? { level } : {}) });
          const res = await fetch(`/api/highscores?${q}`);
          const data = await res.json();
          if (!cancelled) {
            setBest(data.best ?? null);
            setLeaderboard(data.leaderboard ?? []);
          }
        } catch {
          if (!cancelled) setBest(null);
        }
      } else {
        const raw = localStorage.getItem(key(game, level));
        if (!cancelled) setBest(raw ? Number(raw) : null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [game, level, session]);

  const isBetter = useCallback(
    (score: number, current: number | null) => current === null || (higherIsBetter ? score > current : score < current),
    [higherIsBetter],
  );

  const submit = useCallback(
    async (score: number) => {
      setBest((prev) => (isBetter(score, prev) ? score : prev));
      if (session?.user) {
        fetch("/api/highscores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game, score, level }),
        }).catch(() => {});
      } else {
        const cur = localStorage.getItem(key(game, level));
        if (isBetter(score, cur ? Number(cur) : null)) {
          localStorage.setItem(key(game, level), String(score));
        }
      }
    },
    [game, level, session, isBetter],
  );

  return { best, leaderboard, loading, submit, loggedIn: Boolean(session?.user) };
}
