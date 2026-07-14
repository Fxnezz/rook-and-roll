"use client";

import { keyMoments, type GameAnalysis, type MoveQuality } from "@/lib/engine/analysis";
import type { Color } from "chess.js";

const QUALITY_META: Record<MoveQuality, { label: string; color: string; short: string }> = {
  brilliant: { label: "Brilliant", color: "#4fc3d9", short: "!!" },
  best: { label: "Best", color: "#5bbf7a", short: "✓" },
  good: { label: "Good", color: "#8bd0a0", short: "·" },
  inaccuracy: { label: "Inaccuracy", color: "#e5b13a", short: "?!" },
  mistake: { label: "Mistake", color: "#e5843a", short: "?" },
  blunder: { label: "Blunder", color: "#e5604d", short: "??" },
};

/** Anything past this is really an encoded mate score (see analysis.ts's MATE_CP = 10_000), not a real centipawn eval. */
const MATE_THRESHOLD_CP = 9_000;
const DISPLAY_CLAMP_CP = 800;

/**
 * Hand-rolled evaluation-over-time chart — same white-fills-from-the-bottom
 * visual language as EvalBar.tsx, just stretched across every ply instead of
 * a single position. cp is clamped to ±800 for display; mate scores pin to
 * the top/bottom edge instead of being drawn (mostly) off-chart.
 */
function EvalGraph({
  moves,
  viewPly,
  onGoToPly,
}: {
  moves: GameAnalysis["moves"];
  viewPly: number;
  onGoToPly: (ply: number) => void;
}) {
  if (moves.length === 0) return null;
  const w = 300;
  const h = 56;
  const n = moves.length;

  const whiteFraction = (evalCp: number) => {
    const isMate = Math.abs(evalCp) >= MATE_THRESHOLD_CP;
    const clamped = isMate
      ? Math.sign(evalCp) * DISPLAY_CLAMP_CP
      : Math.max(-DISPLAY_CLAMP_CP, Math.min(DISPLAY_CLAMP_CP, evalCp));
    return (clamped + DISPLAY_CLAMP_CP) / (DISPLAY_CLAMP_CP * 2);
  };
  const xAt = (ply: number) => (n === 1 ? w / 2 : (ply / n) * w);
  const yAt = (frac: number) => h * (1 - frac);

  // Curve starts flat (0.0) before the first move, then one point per ply.
  const points: { x: number; y: number; ply: number }[] = [{ x: 0, y: h / 2, ply: 0 }];
  moves.forEach((m, i) => points.push({ x: xAt(i + 1), y: yAt(whiteFraction(m.evalCp)), ply: m.ply }));

  const areaPath =
    `M 0,${h} L ` + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ") + ` L ${w},${h} Z`;
  const linePath = "M " + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  const cursorX = xAt(viewPly);

  const handleClick: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const ply = Math.max(0, Math.min(n, Math.round(frac * n)));
    onGoToPly(ply);
  };

  return (
    <div className="px-3 pb-3">
      <span className="label mb-1 block">Evaluation over time</span>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block h-14 w-full cursor-pointer rounded-md"
        style={{ background: "#2b2f37" }}
        onClick={handleClick}
        role="img"
        aria-label="Evaluation over time"
      >
        <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <path d={areaPath} fill="#f1ece0" fillOpacity={0.92} />
        <path d={linePath} fill="none" stroke="#f1ece0" strokeWidth={1.25} />
        {viewPly > 0 && <line x1={cursorX} y1={0} x2={cursorX} y2={h} stroke="#5aa8e0" strokeWidth={1.5} />}
      </svg>
    </div>
  );
}

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
        {(["brilliant", "blunder", "mistake", "inaccuracy"] as MoveQuality[])
          .filter((q) => q !== "brilliant" || analysis.summary[color][q] > 0)
          .map((q) => (
            <div key={q} className="flex items-center justify-between text-xs">
              <span style={{ color: QUALITY_META[q].color }}>{QUALITY_META[q].label}</span>
              <span className="font-mono">{analysis.summary[color][q]}</span>
            </div>
          ))}
      </div>
    </div>
  );

  const moments = keyMoments(analysis);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 p-3">
        <Side color="w" />
        <Side color="b" />
      </div>
      <EvalGraph moves={analysis.moves} viewPly={viewPly} onGoToPly={onGoToPly} />
      {moments.length > 0 && (
        <div className="px-3 pb-3">
          <span className="label mb-1 block">Key moments</span>
          <div className="flex flex-col gap-1">
            {moments.map((m) => {
              const num = Math.ceil(m.ply / 2);
              const gained = m.color === "w" ? m.swingCp > 0 : m.swingCp < 0;
              return (
                <button
                  key={m.ply}
                  onClick={() => onGoToPly(m.ply)}
                  className="flex items-center gap-2 rounded-md bg-[var(--bg-elev)] px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--bg-elev-2)]"
                >
                  <span className="font-mono font-semibold">
                    {m.color === "w" ? `${num}.` : `${num}…`} {m.san}
                  </span>
                  <span className="font-bold" style={{ color: QUALITY_META[m.quality].color }}>
                    {QUALITY_META[m.quality].short}
                  </span>
                  <span className="ml-auto text-[var(--text-faint)]">
                    {m.color === "w" ? "White" : "Black"} {gained ? "swung the game" : "let it slip"} (
                    {m.swingCp > 0 ? "+" : ""}
                    {(m.swingCp / 100).toFixed(1)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {analysis.moves.map((m) => {
          const meta = QUALITY_META[m.quality];
          const active = m.ply === viewPly;
          const num = Math.ceil(m.ply / 2);
          return (
            <div
              key={m.ply}
              role="button"
              tabIndex={0}
              onClick={() => onGoToPly(m.ply)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onGoToPly(m.ply);
                }
              }}
              className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors ${
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
              {(m.quality === "mistake" || m.quality === "blunder") && (
                <a
                  href={`/play/bot?fen=${encodeURIComponent(m.beforeFen)}`}
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--bg-elev)] ${m.cpLoss >= 70 ? "" : "ml-auto"}`}
                  title="Replay this position against a bot and find a better move"
                  onClick={(e) => e.stopPropagation()}
                >
                  retry
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
