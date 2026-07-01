"use client";

interface Point {
  rating: number;
  label?: string;
}

/** Minimal, dependency-free line chart for a rating timeline. */
export function RatingChart({ points, height = 160 }: { points: Point[]; height?: number }) {
  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-[var(--bg-elev)] text-sm text-[var(--text-faint)]"
        style={{ height }}
      >
        Play a few rated games to see your rating trend.
      </div>
    );
  }

  const W = 600;
  const H = height;
  const padX = 8;
  const padY = 16;
  const ratings = points.map((p) => p.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const span = Math.max(40, max - min);
  const mid = (min + max) / 2;
  const lo = mid - span / 2 - 20;
  const hi = mid + span / 2 + 20;

  const x = (i: number) => padX + (i / (points.length - 1)) * (W - padX * 2);
  const y = (r: number) => padY + (1 - (r - lo) / (hi - lo)) * (H - padY * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`;
  const last = points[points.length - 1].rating;
  const first = points[0].rating;
  const up = last >= first;
  const stroke = up ? "var(--good)" : "var(--bad)";

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ratingFill)" />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={x(points.length - 1)} cy={y(last)} r="3" fill={stroke} />
      </svg>
      <div className="pointer-events-none absolute right-1 top-1 text-xs font-bold" style={{ color: stroke }}>
        {last} {up ? "▲" : "▼"}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--text-faint)]">
        <span>{Math.round(lo)}</span>
        <span>{Math.round(hi)}</span>
      </div>
    </div>
  );
}
