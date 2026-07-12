import Link from "next/link";
import type { GameSummary } from "@/lib/db/profileStats";

const OUTCOME_BADGE = {
  win: { label: "Win", color: "var(--good)" },
  loss: { label: "Loss", color: "var(--bad)" },
  draw: { label: "Draw", color: "var(--text-muted)" },
} as const;

export function RecentGamesList({ games, username }: { games: GameSummary[]; username: string }) {
  if (games.length === 0) return null;

  return (
    <section className="panel mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="label block">Recent games</span>
        <Link href={`/games?user=${username}`} className="text-xs font-semibold text-[var(--accent)] hover:underline">
          View all
        </Link>
      </div>
      <div className="flex flex-col divide-y divide-[var(--border)]">
        {games.map((g) => {
          const badge = OUTCOME_BADGE[g.outcome];
          return (
            <div key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
              <span className="min-w-0 truncate">vs {g.opponent}</span>
              <span className="shrink-0 text-xs capitalize text-[var(--text-faint)]">{g.category}</span>
              <span className="shrink-0 text-xs font-semibold" style={{ color: badge.color }}>
                {badge.label}
              </span>
              <span className="shrink-0 text-xs text-[var(--text-faint)]">{g.createdAt.toLocaleDateString()}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
