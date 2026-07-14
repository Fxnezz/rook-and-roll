import type { Move } from "chess.js";

const PIECE_CP: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900 };

/** Material balance (White minus Black, centipawns) reading a FEN's placement directly. */
function materialDiffFromFen(fen: string): number {
  let diff = 0;
  for (const ch of fen.split(" ")[0]) {
    const val = PIECE_CP[ch.toLowerCase()];
    if (!val) continue;
    diff += ch === ch.toLowerCase() ? -val : val;
  }
  return diff;
}

/** Postgame material-advantage strip — one bar per ply, above/below the midline for White/Black material lead. */
export function MaterialTimeline({ moves }: { moves: Move[] }) {
  if (moves.length === 0) return null;
  const diffs = moves.map((m) => materialDiffFromFen(m.after));
  const maxAbs = Math.max(...diffs.map((d) => Math.abs(d)), 300);

  const w = 300;
  const h = 48;
  const mid = h / 2;
  const barW = w / moves.length;

  return (
    <div className="px-3 pb-3">
      <span className="label mb-1 block">Material</span>
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-12 w-full rounded-md" style={{ background: "#2b2f37" }}>
        <line x1={0} y1={mid} x2={w} y2={mid} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
        {diffs.map((d, i) => {
          const barH = (Math.min(Math.abs(d), maxAbs) / maxAbs) * mid;
          return (
            <rect
              key={i}
              x={i * barW}
              y={d >= 0 ? mid - barH : mid}
              width={Math.max(1, barW - 0.5)}
              height={barH}
              fill={d >= 0 ? "#f1ece0" : "#8a94a6"}
            />
          );
        })}
      </svg>
    </div>
  );
}
