"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const KEY = "rr.weeklyRecap.lastAt.v1";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function load(): number {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function save(at: number) {
  try {
    localStorage.setItem(KEY, String(at));
  } catch {
    // ignore
  }
}

/**
 * Triggers the player-facing weekly recap notification (see
 * src/app/api/me/weekly-recap/route.ts) the next time a signed-in user loads
 * the app more than 7 days after the last check — mirrors the same
 * localStorage-gated, no-cron pattern used for the moderator weekly summary
 * (src/lib/moderation/useModStats.ts), just without a client-tracked counter
 * since the recap is computed entirely server-side from the Game table.
 */
export function useWeeklyRecap() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const lastAt = load();
    if (lastAt === 0) {
      save(Date.now());
      return;
    }
    if (Date.now() - lastAt < WEEK_MS) return;
    fetch("/api/me/weekly-recap", { method: "POST" })
      .then(() => save(Date.now()))
      .catch(() => {});
  }, [status]);
}
