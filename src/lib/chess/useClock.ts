"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Color } from "chess.js";

export type TimeCategory = "bullet" | "blitz" | "rapid" | "classical" | "untimed";

export interface TimeControl {
  id: string;
  name: string;
  /** starting time per side in ms; null = untimed */
  initialMs: number | null;
  incrementMs: number;
  category: TimeCategory;
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

export function getTimeControl(id: string): TimeControl {
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

/** Derived (not stored) urgency tier for low-time visual/audio feedback. */
export function getClockUrgency(ms: number): ClockUrgency {
  if (ms < 10_000) return "critical";
  if (ms < 30_000) return "low";
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

  useEffect(() => {
    if (untimed) return;
    const iv = setInterval(() => {
      if (!runningRef.current || flaggedRef.current) return;
      const now = performance.now();
      const dt = now - lastRef.current;
      lastRef.current = now;
      setActive((cur) => {
        if (cur === "w" && !frozenRef.current.w) {
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
  }, [untimed]);

  const start = useCallback(
    (color: Color) => {
      if (untimed) return;
      lastRef.current = performance.now();
      runningRef.current = true;
      setActive(color);
    },
    [untimed],
  );

  const moved = useCallback(
    (mover: Color) => {
      if (untimed) return;
      if (mover === "w") setWhiteMs((m) => m + tc.incrementMs);
      else setBlackMs((m) => m + tc.incrementMs);
      lastRef.current = performance.now();
      runningRef.current = true;
      setActive(mover === "w" ? "b" : "w");
    },
    [untimed, tc.incrementMs],
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
