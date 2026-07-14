import type {
  CategoryStat,
  ColorStats,
  GameSummary,
  OpeningStat,
  OpponentStat,
  PersonalRecords,
  RatedGameHighlight,
  TerminationStat,
} from "@/lib/db/profileStats";

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function ColorCard({ label, stats }: { label: string; stats: ColorStats }) {
  const total = stats.wins + stats.losses + stats.draws;
  return (
    <div className="rounded-lg bg-[var(--bg-elev)] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="font-mono text-lg font-black text-[var(--accent)]">{pct(stats.wins, total)}%</span>
      </div>
      <span className="text-xs text-[var(--text-faint)]">
        {stats.wins}W {stats.losses}L {stats.draws}D · {total} games
      </span>
      <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
        {stats.wins > 0 && <div style={{ width: `${pct(stats.wins, total)}%`, background: "var(--good)" }} />}
        {stats.draws > 0 && <div style={{ width: `${pct(stats.draws, total)}%`, background: "var(--text-faint)" }} />}
        {stats.losses > 0 && <div style={{ width: `${pct(stats.losses, total)}%`, background: "var(--bad)" }} />}
      </div>
    </div>
  );
}

function CategoryRow({ stat }: { stat: CategoryStat }) {
  const total = stat.wins + stat.losses + stat.draws;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs capitalize text-[var(--text-muted)]">{stat.category}</span>
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
        {stat.wins > 0 && <div style={{ width: `${pct(stat.wins, total)}%`, background: "var(--good)" }} />}
        {stat.draws > 0 && <div style={{ width: `${pct(stat.draws, total)}%`, background: "var(--text-faint)" }} />}
        {stat.losses > 0 && <div style={{ width: `${pct(stat.losses, total)}%`, background: "var(--bad)" }} />}
      </div>
      <span className="w-24 shrink-0 text-right text-xs text-[var(--text-faint)]">
        {pct(stat.wins, total)}% · {total}
      </span>
    </div>
  );
}

function TerminationRow({ stat, total }: { stat: TerminationStat; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-xs text-[var(--text-muted)]">{stat.termination}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
        <div style={{ width: `${pct(stat.count, total)}%`, background: "var(--accent)" }} className="h-full rounded-full" />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-[var(--text-faint)]">{stat.count}</span>
    </div>
  );
}

function RecordCard({ label, game }: { label: string; game: GameSummary | null }) {
  if (!game) return null;
  return (
    <div className="rounded-lg bg-[var(--bg-elev)] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="font-mono text-lg font-black text-[var(--accent)]">{game.ply} ply</span>
      </div>
      <span className="text-xs text-[var(--text-faint)]">
        vs {game.opponent} · {game.category} · {game.createdAt.toLocaleDateString()}
      </span>
    </div>
  );
}

function HighlightCard({ label, game, tone }: { label: string; game: RatedGameHighlight | null; tone: "good" | "bad" }) {
  if (!game) return null;
  return (
    <div className="rounded-lg bg-[var(--bg-elev)] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="font-mono text-lg font-black" style={{ color: tone === "good" ? "var(--good)" : "var(--bad)" }}>
          {game.opponentRating}
        </span>
      </div>
      <span className="text-xs text-[var(--text-faint)]">
        vs {game.opponent} · {game.category} · {game.createdAt.toLocaleDateString()}
      </span>
    </div>
  );
}

function OpponentRow({ stat }: { stat: OpponentStat }) {
  const total = stat.wins + stat.losses + stat.draws;
  return (
    <div className="flex items-center gap-3">
      <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-muted)]">{stat.opponent}</span>
      <div className="flex h-2 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
        {stat.wins > 0 && <div style={{ width: `${pct(stat.wins, total)}%`, background: "var(--good)" }} />}
        {stat.draws > 0 && <div style={{ width: `${pct(stat.draws, total)}%`, background: "var(--text-faint)" }} />}
        {stat.losses > 0 && <div style={{ width: `${pct(stat.losses, total)}%`, background: "var(--bad)" }} />}
      </div>
      <span className="w-20 shrink-0 text-right text-xs text-[var(--text-faint)]">
        {stat.wins}W {stat.losses}L {stat.draws}D
      </span>
      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-[var(--text-faint)]">
        {stat.avgOpponentRating ?? "—"}
      </span>
    </div>
  );
}

function OpeningRow({ stat }: { stat: OpeningStat }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 shrink-0 rounded bg-[var(--bg-elev-2)] px-1 py-0.5 text-center font-mono text-[10px] font-bold text-[var(--text-muted)]">
        {stat.eco}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-muted)]">{stat.name}</span>
      <div className="flex h-2 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
        {stat.wins > 0 && <div style={{ width: `${pct(stat.wins, stat.games)}%`, background: "var(--good)" }} />}
        {stat.draws > 0 && <div style={{ width: `${pct(stat.draws, stat.games)}%`, background: "var(--text-faint)" }} />}
        {stat.losses > 0 && <div style={{ width: `${pct(stat.losses, stat.games)}%`, background: "var(--bad)" }} />}
      </div>
      <span className="w-20 shrink-0 text-right text-xs text-[var(--text-faint)]">
        {stat.wins}W {stat.losses}L {stat.draws}D
      </span>
    </div>
  );
}

export function ProfileBreakdowns({
  colorStats,
  categoryStats,
  terminationStats,
  longestGame,
  fastestCheckmate,
  openingsReport,
  records,
  bestWin,
  toughestLoss,
  opponentsTable,
}: {
  colorStats: { white: ColorStats; black: ColorStats };
  categoryStats: CategoryStat[];
  terminationStats: TerminationStat[];
  longestGame: GameSummary | null;
  fastestCheckmate: GameSummary | null;
  openingsReport: OpeningStat[];
  records: PersonalRecords;
  bestWin: RatedGameHighlight | null;
  toughestLoss: RatedGameHighlight | null;
  opponentsTable: OpponentStat[];
}) {
  const terminationTotal = terminationStats.reduce((sum, t) => sum + t.count, 0);

  return (
    <section className="panel mt-4 p-4">
      <span className="label mb-3 block">Breakdowns</span>

      <div className="grid gap-2 sm:grid-cols-2">
        <ColorCard label="As White" stats={colorStats.white} />
        <ColorCard label="As Black" stats={colorStats.black} />
      </div>

      {categoryStats.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">By time control</span>
          {categoryStats.map((s) => (
            <CategoryRow key={s.category} stat={s} />
          ))}
        </div>
      )}

      {terminationStats.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">How games end</span>
          {terminationStats.map((s) => (
            <TerminationRow key={s.termination} stat={s} total={terminationTotal} />
          ))}
        </div>
      )}

      {openingsReport.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Most-played openings</span>
          {openingsReport.map((s) => (
            <OpeningRow key={s.name} stat={s} />
          ))}
        </div>
      )}

      {(longestGame || fastestCheckmate) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <RecordCard label="Longest game" game={longestGame} />
          <RecordCard label="Fastest checkmate" game={fastestCheckmate} />
        </div>
      )}

      {(bestWin || toughestLoss) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <HighlightCard label="Best win" game={bestWin} tone="good" />
          <HighlightCard label="Toughest loss" game={toughestLoss} tone="bad" />
        </div>
      )}

      {(records.biggestUpset || records.longestWinStreak > 0 || records.mostGamesInADay > 0) && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Personal records</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {records.biggestUpset && <HighlightCard label="Biggest upset" game={records.biggestUpset} tone="good" />}
            {records.longestWinStreak > 0 && (
              <div className="rounded-lg bg-[var(--bg-elev)] p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Longest win streak</span>
                  <span className="font-mono text-lg font-black text-[var(--accent)]">{records.longestWinStreak}</span>
                </div>
              </div>
            )}
            {records.mostGamesInADay > 0 && (
              <div className="rounded-lg bg-[var(--bg-elev)] p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Most games in a day</span>
                  <span className="font-mono text-lg font-black text-[var(--accent)]">{records.mostGamesInADay}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {opponentsTable.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Opponents</span>
          {opponentsTable.slice(0, 8).map((s) => (
            <OpponentRow key={s.opponent} stat={s} />
          ))}
        </div>
      )}
    </section>
  );
}
