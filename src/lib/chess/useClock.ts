"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Color } from "chess.js";

export type TimeCategory = "bullet" | "blitz" | "rapid" | "classical" | "untimed";

/**
 * How incrementMs is applied once a move completes:
 * - "increment" (Fischer): added on top of whatever time remains — can grow your clock.
 * - "us" (simple/US delay): each turn gets incrementMs of "free" thinking time before the
 *   main clock starts counting down at all — never adds time, just delays the countdown.
 * - "bronstein": time actually spent this move is refunded, capped at incrementMs — you
 *   can never gain net time, but never lose more than incrementMs on a fast move either.
 */
export type DelayMode = "increment" | "us" | "bronstein";

export interface TimeControl {
  id: string;
  name: string;
  /** starting time per side in ms; null = untimed */
  initialMs: number | null;
  incrementMs: number;
  category: TimeCategory;
  delayMode?: DelayMode;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: "untimed", name: "Untimed", initialMs: null, incrementMs: 0, category: "untimed" },
  { id: "1+0", name: "1 min", initialMs: 60_000, incrementMs: 0, category: "bullet" },
  { id: "2+1", name: "2 | 1", initialMs: 120_000, incrementMs: 1_000, category: "bullet" },
  { id: "3+0", name: "3 min", initialMs: 180_000, incrementMs: 0, category: "blitz" },
  { id: "3+2", name: "3 | 2", initialMs: 180_000, incrementMs: 2_000, category: "blitz" },
  { id: "5+0", name: "5 min", initialMs: 300_000, incrementMs: 0, category: "blitz" },
  { id: "10+0", name: "10 min", initialMs: 600_000, incrementMs: 0, category: "rapid" },
  { id: "15+10", name: "15 | 10", initialMs: 900_000, incrementMs: 10_000, category: "rapid" },
  { id: "30+0", name: "30 min", initialMs: 1_800_000, incrementMs: 0, category: "classical" },
];

/** Minutes clamped to a sane custom-control range: 15 seconds .. 3 hours. */
export const CUSTOM_MIN_MINUTES = 0.25;
export const CUSTOM_MAX_MINUTES = 180;
/** Per-move increment clamped to 0..60 seconds. */
export const CUSTOM_MIN_INCREMENT_SEC = 0;
export const CUSTOM_MAX_INCREMENT_SEC = 60;

export function clampCustomMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return CUSTOM_MIN_MINUTES;
  return Math.min(CUSTOM_MAX_MINUTES, Math.max(CUSTOM_MIN_MINUTES, minutes));
}

export function clampCustomIncrementSec(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(CUSTOM_MAX_INCREMENT_SEC, Math.max(CUSTOM_MIN_INCREMENT_SEC, Math.round(seconds)));
}

/** Builds the self-describing id a custom time control is stored/looked-up by. */
export function customTimeControlId(minutes: number, incrementSec: number, delayMode: DelayMode = "increment"): string {
  const initialMs = Math.round(clampCustomMinutes(minutes) * 60_000);
  const incrementMs = clampCustomIncrementSec(incrementSec) * 1_000;
  return `custom:${initialMs}:${incrementMs}:${delayMode}`;
}

const DELAY_MODE_LABEL: Record<DelayMode, string> = { increment: "", us: " US delay", bronstein: " Bronstein" };

function formatCustomLabel(initialMs: number, incrementMs: number, delayMode: DelayMode): string {
  const mins = Math.round((initialMs / 60_000) * 10) / 10;
  const minsLabel = Number.isInteger(mins) ? `${mins}` : mins.toFixed(1);
  const incSec = Math.round(incrementMs / 1000);
  const base = incSec > 0 ? `${minsLabel} | ${incSec}` : `${minsLabel} min`;
  return base + DELAY_MODE_LABEL[delayMode];
}

export function getTimeControl(id: string): TimeControl {
  if (id.startsWith("custom:")) {
    const [, initialStr, incStr, delayStr] = id.split(":");
    const initialMs = Number(initialStr);
    const incrementMs = Number(incStr);
    const delayMode: DelayMode = delayStr === "us" || delayStr === "bronstein" ? delayStr : "increment";
    if (Number.isFinite(initialMs) && initialMs > 0 && Number.isFinite(incrementMs)) {
      return {
        id,
        name: formatCustomLabel(initialMs, incrementMs, delayMode),
        initialMs,
        incrementMs,
        category: categoryForMs(initialMs, incrementMs),
        delayMode,
      };
    }
  }
  return TIME_CONTROLS.find((t) => t.id === id) ?? TIME_CONTROLS[0];
}

export function categoryForMs(initialMs: number | null, incMs: number): TimeCategory {
  if (initialMs == null) return "untimed";
  const est = initialMs + 40 * incMs;
  if (est < 179_000) return "bullet";
  if (est < 599_000) return "blitz";
  if (est < 1_499_000) return "rapid";
  return "classical";
}

export type ClockUrgency = "normal" | "low" | "critical";

/** Derived (not stored) urgency tier for low-time visual/audio feedback.
 * `criticalThresholdMs` is the user-configurable threshold (Settings >
 * Gameplay > "Low-time warning threshold", default 10s); the "low" tier
 * kicks in at 3x that so the two tiers scale together. */
export function getClockUrgency(ms: number, criticalThresholdMs = 10_000): ClockUrgency {
  if (ms < criticalThresholdMs) return "critical";
  if (ms < criticalThresholdMs * 3) return "low";
  return "normal";
}

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 1 || clamped >= 10_000) {
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  // show tenths under 10s
  const tenths = Math.floor((clamped % 1000) / 100);
  return `${m}:${s.toString().padStart(2, "0")}.${tenths}`;
}

export interface UseClock {
  whiteMs: number;
  blackMs: number;
  active: Color | null;
  untimed: boolean;
  /** begin counting down for `color` (e.g. White at game start) */
  start: (color: Color) => void;
  /** call after `mover` completes a move: adds increment, switches to opponent */
  moved: (mover: Color) => void;
  stop: () => void;
  reset: () => void;
  /** Cheat-panel/dev tool: add or subtract ms from a side's clock. */
  addTime: (color: Color, ms: number) => void;
  /** Cheat-panel/dev tool: pause a side's countdown regardless of whose turn it is. */
  setFrozen: (color: Color, frozen: boolean) => void;
  frozen: { w: boolean; b: boolean };
}

export function useClock(tc: TimeControl, onFlag: (loser: Color) => void): UseClock {
  const untimed = tc.initialMs == null;
  const delayMode: DelayMode = tc.delayMode ?? "increment";
  const [whiteMs, setWhiteMs] = useState(tc.initialMs ?? 0);
  const [blackMs, setBlackMs] = useState(tc.initialMs ?? 0);
  const [active, setActive] = useState<Color | null>(null);
  const [frozen, setFrozenState] = useState<{ w: boolean; b: boolean }>({ w: false, b: false });
  const runningRef = useRef(false);
  const lastRef = useRef(0);
  const flaggedRef = useRef(false);
  const onFlagRef = useRef(onFlag);
  onFlagRef.current = onFlag;
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  // "us" delay: free thinking time remaining this turn, ticked down before the
  // main clock starts moving at all. "bronstein": when the current turn began,
  // so moved() can refund whatever was actually spent (capped at incrementMs).
  const delayRemainingRef = useRef<{ w: number; b: number }>({ w: 0, b: 0 });
  const turnStartRef = useRef(0);

  useEffect(() => {
    if (untimed) return;
    const iv = setInterval(() => {
      if (!runningRef.current || flaggedRef.current) return;
      const now = performance.now();
      const dt = now - lastRef.current;
      lastRef.current = now;
      setActive((cur) => {
        if (cur === "w" && !frozenRef.current.w) {
          if (delayMode === "us" && delayRemainingRef.current.w > 0) {
            delayRemainingRef.current.w = Math.max(0, delayRemainingRef.current.w - dt);
            return cur;
          }
          setWhiteMs((m) => {
            const n = m - dt;
            if (n <= 0 && !flaggedRef.current) {
              flaggedRef.current = true;
              runningRef.current = false;
              onFlagRef.current("w");
              return 0;
            }
            return n;
          });
        } else if (cur === "b" && !frozenRef.current.b) {
          if (delayMode === "us" && delayRemainingRef.current.b > 0) {
            delayRemainingRef.current.b = Math.max(0, delayRemainingRef.current.b - dt);
            return cur;
          }
          setBlackMs((m) => {
            const n = m - dt;
            if (n <= 0 && !flaggedRef.current) {
              flaggedRef.current = true;
              runningRef.current = false;
              onFlagRef.current("b");
              return 0;
            }
            return n;
          });
        }
        return cur;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [untimed, delayMode]);

  const start = useCallback(
    (color: Color) => {
      if (untimed) return;
      lastRef.current = performance.now();
      turnStartRef.current = lastRef.current;
      if (delayMode === "us") delayRemainingRef.current[color] = tc.incrementMs;
      runningRef.current = true;
      setActive(color);
    },
    [untimed, delayMode, tc.incrementMs],
  );

  const moved = useCallback(
    (mover: Color) => {
      if (untimed) return;
      if (delayMode === "increment") {
        if (mover === "w") setWhiteMs((m) => m + tc.incrementMs);
        else setBlackMs((m) => m + tc.incrementMs);
      } else if (delayMode === "bronstein") {
        const elapsed = performance.now() - turnStartRef.current;
        const refund = Math.min(elapsed, tc.incrementMs);
        if (mover === "w") setWhiteMs((m) => m + refund);
        else setBlackMs((m) => m + refund);
      }
      const next = mover === "w" ? "b" : "w";
      if (delayMode === "us") delayRemainingRef.current[next] = tc.incrementMs;
      lastRef.current = performance.now();
      turnStartRef.current = lastRef.current;
      runningRef.current = true;
      setActive(next);
    },
    [untimed, delayMode, tc.incrementMs],
  );

  const stop = useCallback(() => {
    runningRef.current = false;
    setActive(null);
  }, []);

  const reset = useCallback(() => {
    runningRef.current = false;
    flaggedRef.current = false;
    setWhiteMs(tc.initialMs ?? 0);
    setBlackMs(tc.initialMs ?? 0);
    setActive(null);
    setFrozenState({ w: false, b: false });
    delayRemainingRef.current = { w: 0, b: 0 };
    turnStartRef.current = 0;
  }, [tc.initialMs]);

  const addTime = useCallback((color: Color, ms: number) => {
    if (color === "w") setWhiteMs((m) => Math.max(0, m + ms));
    else setBlackMs((m) => Math.max(0, m + ms));
  }, []);

  const setFrozen = useCallback((color: Color, value: boolean) => {
    setFrozenState((f) => ({ ...f, [color]: value }));
  }, []);

  return { whiteMs, blackMs, active, untimed, start, moved, stop, reset, addTime, setFrozen, frozen };
}
