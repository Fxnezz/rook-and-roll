"use client";

import { useEffect, useRef } from "react";
import { formatClock, getClockUrgency } from "@/lib/chess/useClock";
import { playSound } from "@/lib/chess/sound";

export function Clock({
  ms,
  active,
  low,
  tickSound = false,
}: {
  ms: number;
  active: boolean;
  low?: boolean;
  /** Play a soft tick once per second while critical and active (own clock only, not the opponent's). */
  tickSound?: boolean;
}) {
  const urgency = low === true ? "critical" : low === false ? "normal" : getClockUrgency(ms);
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
      {formatClock(ms)}
    </div>
  );
}
