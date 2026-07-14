import type { Move } from "chess.js";

/** Postgame "how long did each side think" bar chart — one bar per ply, colored by mover. */
export function TimeUsageChart({ moves, moveTimes }: { moves: Move[]; moveTimes: number[] }) {
  const n = Math.min(moves.length, moveTimes.length);
  if (n === 0) return null;

  const maxMs = Math.max(...moveTimes.slice(0, n), 1000);
  const totals = { w: 0, b: 0 };
  for (let i = 0; i < n; i++) totals[moves[i].color] += moveTimes[i];

  const w = 300;
  const h = 64;
  const barW = w / n;

  return (
    <div className="px-3 pb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="label">Time usage</span>
        <span className="text-xs text-[var(--text-faint)]">
          White {(totals.w / 1000).toFixed(0)}s · Black {(totals.b / 1000).toFixed(0)}s
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-16 w-full rounded-md" style={{ background: "#2b2f37" }}>
        {Array.from({ length: n }, (_, i) => {
          const barH = (Math.min(moveTimes[i], maxMs) / maxMs) * h;
          return (
            <rect
              key={i}
              x={i * barW}
              y={h - barH}
              width={Math.max(1, barW - 0.5)}
              height={barH}
              fill={moves[i].color === "w" ? "#f1ece0" : "#8a94a6"}
            />
          );
        })}
      </svg>
    </div>
  );
}
