"use client";

import { useCallback, useEffect, useState } from "react";

const STATS_KEY = "rr.mod.stats.v1";
const GUARDIAN_THRESHOLD = 10;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type ModActionKind = "mutes" | "warnings" | "pauses" | "flagsForReview" | "cheatFlags";

interface ModStatsData {
  mutes: number;
  warnings: number;
  pauses: number;
  flagsForReview: number;
  cheatFlags: number;
  /** epoch ms this browser last reported a weekly summary. */
  lastSummaryAt: number;
  /** total action count as of the last summary, so we only report the delta. */
  totalAtLastSummary: number;
  /** avoids re-POSTing the guardian award every render once the threshold is crossed. */
  guardianRequested: boolean;
}

const DEFAULTS: ModStatsData = {
  mutes: 0,
  warnings: 0,
  pauses: 0,
  flagsForReview: 0,
  cheatFlags: 0,
  lastSummaryAt: 0,
  totalAtLastSummary: 0,
  guardianRequested: false,
};

function load(): ModStatsData {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(data: ModStatsData) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(data));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Client-side-only (per-browser, not account-wide) lifetime counters for the
 * in-game moderator's own actions across every game — powers the profile
 * "My moderation stats" card, the Community Guardian achievement, and a
 * best-effort weekly summary notification (there's no cron infrastructure in
 * this project, so this is client-triggered on next load past the 7-day mark).
 */
export function useModStats() {
  const [stats, setStats] = useState<ModStatsData>(DEFAULTS);

  useEffect(() => {
    const loaded = load();
    if (loaded.lastSummaryAt === 0) {
      // First-ever load: start the weekly clock now rather than firing an
      // immediate summary for zero prior activity.
      loaded.lastSummaryAt = Date.now();
      save(loaded);
    }
    setStats(loaded);
  }, []);

  const total = stats.mutes + stats.warnings + stats.pauses + stats.flagsForReview + stats.cheatFlags;

  const increment = useCallback((key: ModActionKind) => {
    setStats((prev) => {
      const next = { ...prev, [key]: prev[key] + 1 };
      save(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (total >= GUARDIAN_THRESHOLD && !stats.guardianRequested) {
      fetch("/api/mod/award-guardian", { method: "POST" }).catch(() => {});
      setStats((prev) => {
        const next = { ...prev, guardianRequested: true };
        save(next);
        return next;
      });
    }
  }, [total, stats.guardianRequested]);

  useEffect(() => {
    if (stats.lastSummaryAt === 0) return; // not yet initialized
    const now = Date.now();
    if (now - stats.lastSummaryAt < WEEK_MS) return;
    const since = total - stats.totalAtLastSummary;
    if (since <= 0) return;
    fetch("/api/mod/weekly-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionsSinceLast: since }),
    })
      .then(() => {
        setStats((prev) => {
          const next = { ...prev, lastSummaryAt: now, totalAtLastSummary: total };
          save(next);
          return next;
        });
      })
      .catch(() => {});
  }, [stats.lastSummaryAt, stats.totalAtLastSummary, total]);

  return { stats, total, increment };
}
