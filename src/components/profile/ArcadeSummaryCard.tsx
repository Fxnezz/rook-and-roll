import type { ArcadeSummary } from "@/lib/db/arcadeSummary";

/** Cross-game totals shown above the per-game breakdown — how much of the arcade this player has actually explored. */
export function ArcadeSummaryCard({ summary }: { summary: ArcadeSummary }) {
  if (summary.totalPlays === 0) return null;

  return (
    <div className="panel mt-4 flex flex-wrap items-center justify-center gap-6 p-4 text-center sm:justify-between">
      <div>
        <div className="text-xl font-black text-[var(--accent)]">{summary.totalPlays}</div>
        <div className="label mt-0.5">Mini-games played</div>
      </div>
      <div>
        <div className="text-xl font-black text-[var(--accent)]">{summary.gamesPlayed}</div>
        <div className="label mt-0.5">Games tried</div>
      </div>
      {summary.favoriteGame && (
        <div>
          <div className="text-xl font-black text-[var(--accent)]">{summary.favoriteGame.label}</div>
          <div className="label mt-0.5">Most played ({summary.favoriteGame.plays}×)</div>
        </div>
      )}
    </div>
  );
}
