import { useMemo, useState } from "react";
import type { Color, Move } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** How many times each side's pieces visited (moved to) each square this game. */
function computeVisits(moves: Move[]): Record<Color, Record<string, number>> {
  const visits: Record<Color, Record<string, number>> = { w: {}, b: {} };
  for (const m of moves) {
    visits[m.color][m.to] = (visits[m.color][m.to] ?? 0) + 1;
  }
  return visits;
}

/** Postgame heatmap of which squares each side's pieces visited most. */
export function PieceActivityHeatmap({ moves }: { moves: Move[] }) {
  const [side, setSide] = useState<Color>("w");
  const visits = useMemo(() => computeVisits(moves), [moves]);
  const sideVisits = visits[side];
  const max = Math.max(1, ...Object.values(sideVisits));

  if (moves.length === 0) return null;

  return (
    <div className="px-3 pb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="label">Piece activity</span>
        <div className="flex gap-1">
          {(["w", "b"] as Color[]).map((c) => (
            <button
              key={c}
              onClick={() => setSide(c)}
              className="rounded px-2 py-0.5 text-xs font-semibold transition-colors"
              style={{
                background: side === c ? "var(--accent)" : "var(--bg-elev)",
                color: side === c ? "var(--accent-contrast)" : "var(--text-muted)",
              }}
            >
              {c === "w" ? "White" : "Black"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid aspect-square w-full max-w-[220px] grid-cols-8 overflow-hidden rounded-md border border-[var(--border)]">
        {Array.from({ length: 8 }, (_, r) => 8 - r).map((rank) =>
          FILES.map((file) => {
            const square = file + rank;
            const n = sideVisits[square] ?? 0;
            const intensity = n / max;
            return (
              <div
                key={square}
                title={`${square}: ${n} visit${n === 1 ? "" : "s"}`}
                className="aspect-square"
                style={{ background: n > 0 ? `rgba(90, 168, 224, ${0.15 + intensity * 0.75})` : "var(--bg-elev)" }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
