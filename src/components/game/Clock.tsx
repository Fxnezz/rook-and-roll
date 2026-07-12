"use client";

import { useEffect, useRef, useState } from "react";
import type { Color } from "chess.js";
import { formatClock, getClockUrgency } from "@/lib/chess/useClock";
import { playSound } from "@/lib/chess/sound";
import type { ClockState } from "@/lib/online/protocol";

export function Clock({
  ms,
  active,
  low,
  tickSound = false,
  reversed = false,
  lowTimeThresholdSec = 10,
}: {
  ms: number;
  active: boolean;
  low?: boolean;
  /** Play a soft tick once per second while critical and active (own clock only, not the opponent's). */
  tickSound?: boolean;
  /** Cosmetic moderator troll — displays the formatted time string reversed. The real `ms` countdown is untouched. */
  reversed?: boolean;
  /** Seconds remaining at which this clock switches into its critical (red/flash/sound) state — Settings > Gameplay. */
  lowTimeThresholdSec?: number;
}) {
  const urgency = low === true ? "critical" : low === false ? "normal" : getClockUrgency(ms, lowTimeThresholdSec * 1000);
  const isLow = urgency !== "normal";
  const lastTickSecond = useRef<number>(-1);

  useEffect(() => {
    if (!tickSound || !active || urgency !== "critical") {
      lastTickSecond.current = -1;
      return;
    }
    const second = Math.ceil(ms / 1000);
    if (second !== lastTickSecond.current && second > 0) {
      lastTickSecond.current = second;
      playSound("lowTime");
    }
  }, [ms, active, urgency, tickSound]);

  return (
    <div
      className={`flex items-center justify-center rounded-md px-3 py-1.5 font-mono text-xl font-bold tabular-nums transition-colors ${
        active && urgency === "critical" ? "clock-pulse-critical" : active && urgency === "low" ? "clock-pulse-low" : ""
      }`}
      style={{
        background: active ? "var(--bg-elev-2)" : "var(--bg-elev)",
        border: `1px solid ${active && isLow ? "var(--bad)" : active ? "var(--accent)" : "var(--border)"}`,
        color: isLow && active ? "var(--bad)" : "var(--text)",
        opacity: active ? 1 : 0.65,
      }}
    >
      {reversed ? formatClock(ms).split("").reverse().join("") : formatClock(ms)}
    </div>
  );
}

/**
 * Wraps Clock for server-synced online games. Ticks its own local state every
 * 200ms instead of the parent patching a shared online-game state object at
 * that rate — keeps the countdown smooth without forcing the whole page
 * (board, arrows, drag state) to re-render 5x/sec.
 */
export function LiveClock({
  clock,
  color,
  gameOver,
  tickSound = false,
  reversed = false,
  lowTimeThresholdSec = 10,
}: {
  clock: ClockState;
  color: Color;
  gameOver: boolean;
  tickSound?: boolean;
  reversed?: boolean;
  lowTimeThresholdSec?: number;
}) {
  const active = clock.activeColor === color && clock.running && !gameOver;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(iv);
  }, [active, clock.updatedAt]);

  const elapsed = active ? Math.max(0, now - clock.updatedAt) : 0;
  const ms = color === "w" ? Math.max(0, clock.whiteMs - elapsed) : Math.max(0, clock.blackMs - elapsed);

  return <Clock ms={ms} active={active} tickSound={tickSound} reversed={reversed} lowTimeThresholdSec={lowTimeThresholdSec} />;
}
