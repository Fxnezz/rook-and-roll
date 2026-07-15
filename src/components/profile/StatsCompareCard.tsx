import type { StatsComparison } from "@/lib/db/compareStats";

function Row({ label, a, b }: { label: string; a: number; b: number }) {
  const better = a === b ? null : a > b ? "a" : "b";
  return (
    <div className="grid grid-cols-3 items-center gap-2 text-sm">
      <span className="text-right font-mono font-semibold" style={{ color: better === "a" ? "var(--good)" : undefined }}>
        {a}
      </span>
      <span className="text-center text-xs text-[var(--text-faint)]">{label}</span>
      <span className="text-left font-mono font-semibold" style={{ color: better === "b" ? "var(--good)" : undefined }}>
        {b}
      </span>
    </div>
  );
}

export function StatsCompareCard({ comparison }: { comparison: StatsComparison }) {
  const { viewer, other } = comparison;
  const viewerTotal = viewer.wins + viewer.losses + viewer.draws;
  const otherTotal = other.wins + other.losses + other.draws;
  const viewerWinRate = viewerTotal > 0 ? Math.round((viewer.wins / viewerTotal) * 100) : 0;
  const otherWinRate = otherTotal > 0 ? Math.round((other.wins / otherTotal) * 100) : 0;

  return (
    <section className="panel mt-4 p-4">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
        <span>{viewer.username}</span>
        <span className="label">Compare</span>
        <span>{other.username}</span>
      </div>
      <div className="flex flex-col gap-2">
        <Row label="Bullet" a={viewer.ratingBullet} b={other.ratingBullet} />
        <Row label="Blitz" a={viewer.ratingBlitz} b={other.ratingBlitz} />
        <Row label="Rapid" a={viewer.ratingRapid} b={other.ratingRapid} />
        <Row label="Classical" a={viewer.ratingClassical} b={other.ratingClassical} />
        <Row label="Puzzle" a={viewer.puzzleRating} b={other.puzzleRating} />
        <div className="my-1 h-px bg-[var(--border)]" />
        <Row label="Games played" a={viewerTotal} b={otherTotal} />
        <Row label="Win rate %" a={viewerWinRate} b={otherWinRate} />
      </div>
    </section>
  );
}
