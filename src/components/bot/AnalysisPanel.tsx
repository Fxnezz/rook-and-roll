"use client";

import type { GameAnalysis, MoveQuality } from "@/lib/engine/analysis";
import type { Color } from "chess.js";

const QUALITY_META: Record<MoveQuality, { label: string; color: string; short: string }> = {
  best: { label: "Best", color: "#5bbf7a", short: "✓" },
  good: { label: "Good", color: "#8bd0a0", short: "·" },
  inaccuracy: { label: "Inaccuracy", color: "#e5b13a", short: "?!" },
  mistake: { label: "Mistake", color: "#e5843a", short: "?" },
  blunder: { label: "Blunder", color: "#e5604d", short: "??" },
};

export function AnalysisPanel({
  analysis,
  progress,
  onGoToPly,
  viewPly,
}: {
  analysis: GameAnalysis | null;
  progress: { done: number; total: number } | null;
  onGoToPly: (ply: number) => void;
  viewPly: number;
}) {
  if (!analysis) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="dot-blink flex gap-1 text-2xl leading-none text-[var(--accent)]">
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Analyzing game{progress ? ` — ${progress.done}/${progress.total} positions` : "…"}
        </p>
        {progress && (
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
            <div
              className="h-full bg-[var(--accent)] transition-[width]"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  const Side = ({ color }: { color: Color }) => (
    <div className="flex-1 rounded-lg bg-[var(--bg-elev)] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{color === "w" ? "White" : "Black"}</span>
        <span className="text-lg font-black text-[var(--accent)]">{analysis.accuracy[color]}%</span>
      </div>
      <span className="label">Accuracy</span>
      <div className="mt-2 flex flex-col gap-1">
        {(["blunder", "mistake", "inaccuracy"] as MoveQuality[]).map((q) => (
          <div key={q} className="flex items-center justify-between text-xs">
            <span style={{ color: QUALITY_META[q].color }}>{QUALITY_META[q].label}</span>
            <span className="font-mono">{analysis.summary[color][q]}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 p-3">
        <Side color="w" />
        <Side color="b" />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {analysis.moves.map((m) => {
          const meta = QUALITY_META[m.quality];
          const active = m.ply === viewPly;
          const num = Math.ceil(m.ply / 2);
          return (
            <button
              key={m.ply}
              onClick={() => onGoToPly(m.ply)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors ${
                active ? "bg-[var(--bg-elev-2)]" : "hover:bg-[var(--bg-elev)]"
              }`}
            >
              <span className="w-8 shrink-0 text-right text-xs text-[var(--text-faint)] tabular-nums">
                {m.color === "w" ? `${num}.` : `${num}…`}
              </span>
              <span className="w-14 shrink-0 font-mono">{m.san}</span>
              <span className="shrink-0 font-bold" style={{ color: meta.color }}>
                {meta.short}
              </span>
              {m.cpLoss >= 70 && (
                <span className="ml-auto text-xs text-[var(--text-faint)]">−{(m.cpLoss / 100).toFixed(1)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
