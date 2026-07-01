"use client";

import { formatClock } from "@/lib/chess/useClock";

export function Clock({
  ms,
  active,
  low,
}: {
  ms: number;
  active: boolean;
  low?: boolean;
}) {
  const isLow = low ?? ms < 20_000;
  return (
    <div
      className="flex items-center justify-center rounded-md px-3 py-1.5 font-mono text-xl font-bold tabular-nums transition-colors"
      style={{
        background: active ? "var(--bg-elev-2)" : "var(--bg-elev)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        color: isLow && active ? "var(--bad)" : "var(--text)",
        opacity: active ? 1 : 0.65,
      }}
    >
      {formatClock(ms)}
    </div>
  );
}
