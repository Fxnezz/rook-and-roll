"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rr.mod.pinnedPlayers";

/**
 * Client-side-only watchlist of usernames the in-game moderator wants to
 * keep an eye on — no server round-trip, no DB row, just a plain
 * localStorage set scoped to this browser.
 */
export function usePinnedPlayers() {
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPinned(new Set(JSON.parse(raw)));
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const toggle = useCallback((username: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore quota/storage errors */
      }
      return next;
    });
  }, []);

  return { pinned, isPinned: (username: string) => pinned.has(username), toggle };
}
