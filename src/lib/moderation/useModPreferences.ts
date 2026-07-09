"use client";

import { useCallback, useEffect, useState } from "react";

const DURATION_KEY = "rr.mod.lastMuteDurationMs";
const PHRASES_KEY = "rr.mod.customWarnPhrases";

/** null means "rest of game" (no auto-unmute timer). */
export function useLastMuteDuration() {
  const [durationMs, setDurationMsState] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(DURATION_KEY);
    if (raw) setDurationMsState(raw === "null" ? null : Number(raw));
  }, []);

  const setDurationMs = useCallback((v: number | null) => {
    setDurationMsState(v);
    try {
      localStorage.setItem(DURATION_KEY, v === null ? "null" : String(v));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return { durationMs, setDurationMs };
}

/** Moderator's own saved warning phrases, on top of the built-in canned ones. */
export function useCustomWarnPhrases() {
  const [phrases, setPhrases] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PHRASES_KEY);
      if (raw) setPhrases(JSON.parse(raw));
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const persist = (next: string[]) => {
    try {
      localStorage.setItem(PHRASES_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota/storage errors */
    }
    return next;
  };

  const addPhrase = useCallback((phrase: string) => {
    const trimmed = phrase.trim();
    if (!trimmed) return;
    setPhrases((prev) => (prev.includes(trimmed) ? prev : persist([...prev, trimmed])));
  }, []);
  const removePhrase = useCallback((phrase: string) => {
    setPhrases((prev) => persist(prev.filter((p) => p !== phrase)));
  }, []);

  return { phrases, addPhrase, removePhrase };
}
