import Link from "next/link";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { DbNotice } from "@/components/ui/DbNotice";
import {
  fetchLeaderboard,
  fetchUserRank,
  fetchNearRank,
  fetchHighScoreLeaderboard,
  fetchHighScoreUserRank,
  fetchHighScoreNearRank,
  type CatKey,
  type Period,
  type RankedRow,
} from "@/lib/leaderboard/query";
import { ALL_HIGHSCORE_GAMES, highScoreGameLabel, formatHighScoreValue } from "@/lib/games/scoreDirection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard" };

const CATEGORIES: { key: CatKey; label: string; icon: string }[] = [
  { key: "ratingBullet", label: "Bullet", icon: "🚀" },
  { key: "ratingBlitz", label: "Blitz", icon: "⚡" },
  { key: "ratingRapid", label: "Rapid", icon: "⏱" },
  { key: "ratingClassical", label: "Classical", icon: "🏛" },
  { key: "puzzleRating", label: "Puzzles", icon: "🧩" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "All-time" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

const PAGE_SIZE = 25;
const NEAR_WINDOW = 5;

function buildHref(base: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...base, ...overrides };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
  const qs = q.toString();
  return qs ? `/leaderboard?${qs}` : "/leaderboard";
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; period?: string; friends?: string; q?: string; page?: string; game?: string; view?: string }>;
}) {
  if (!isDbConfigured) return <DbNotice />;

  const sp = await searchParams;
  const gameMode = sp.game && ALL_HIGHSCORE_GAMES.includes(sp.game) ? sp.game : null;
  const active = CATEGORIES.find((c) => c.label.toLowerCase() === (sp.cat ?? "blitz").toLowerCase()) ?? CATEGORIES[1];
  const field = active.key;
  const period: Period = gameMode ? "all" : PERIODS.some((p) => p.key === sp.period) ? (sp.period as Period) : "all";
  const friendsOnly = !gameMode && sp.friends === "1";
  const search = (sp.q ?? "").trim().slice(0, 40);
  const page = Math.max(1, Number(sp.page) || 1);
  const nearView = sp.view === "near";

  const session = await auth();
  const myId = session?.user?.id ?? null;

  let friendIds: string[] | undefined;
  if (friendsOnly && myId) {
    const rows = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: myId }, { addresseeId: myId }] },
      select: { requesterId: true, addresseeId: true },
    });
    friendIds = rows.map((r) => (r.requesterId === myId ? r.addresseeId : r.requesterId));
    friendIds.push(myId); // see your own entry in the friends-only view
  }

  let rows: { id: string; username: string; value: number; rank?: number }[] = [];
  let total = 0;
  let myRank: { rank: number; value: number } | null = null;
  let nearRows: RankedRow[] | null = null;

  if (nearView && myId) {
    const near = gameMode
      ? await fetchHighScoreNearRank({ game: gameMode, userId: myId, window: NEAR_WINDOW })
      : await fetchNearRank({ field, period, friendIds, userId: myId, window: NEAR_WINDOW });
    nearRows = near?.rows ?? [];
    myRank = near ? { rank: near.viewerRank, value: near.rows.find((r) => r.id === myId)?.value ?? 0 } : null;
  } else {
    const [list, rank] = await Promise.all([
      gameMode
        ? fetchHighScoreLeaderboard({ game: gameMode, search: search || undefined, page, pageSize: PAGE_SIZE })
        : fetchLeaderboard({ field, period, friendIds, search: search || undefined, page, pageSize: PAGE_SIZE }),
      myId
        ? gameMode
          ? fetchHighScoreUserRank({ game: gameMode, userId: myId })
          : fetchUserRank({ field, period, friendIds, userId: myId })
        : Promise.resolve(null),
    ]);
    rows = list.rows;
    total = list.total;
    myRank = rank;
  }

  const baseParams = { cat: sp.cat, period: sp.period, friends: sp.friends, q: sp.q, game: sp.game, view: sp.view };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const valueLabel = gameMode ? "Score" : period === "all" ? "Rating" : "Rating Δ";
  const displayRows = nearView ? nearRows ?? [] : rows;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Leaderboard</h1>
      <p className="mb-5 text-sm text-[var(--text-muted)]">
        {gameMode
          ? `Top scores in ${highScoreGameLabel(gameMode)}.`
          : period === "all"
            ? "Top rated players by time control."
            : `Biggest rating gains ${period === "week" ? "this week" : "this month"}.`}
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={buildHref(baseParams, { cat: c.label.toLowerCase(), page: undefined, game: undefined })}
            className="rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{
              borderColor: !gameMode && c.key === field ? "var(--accent)" : "var(--border)",
              background: !gameMode && c.key === field ? "var(--bg-elev-2)" : "transparent",
              color: !gameMode && c.key === field ? "var(--text)" : "var(--text-muted)",
            }}
          >
            {c.icon} {c.label}
          </Link>
        ))}
      </div>

      <form action="/leaderboard" method="get" className="mb-3 flex items-center gap-2">
        <input type="hidden" name="cat" value={sp.cat ?? ""} />
        <select name="game" defaultValue={gameMode ?? ""} className="input !w-auto text-xs">
          <option value="">🎲 Mini-games…</option>
          {ALL_HIGHSCORE_GAMES.map((g) => (
            <option key={g} value={g}>
              {highScoreGameLabel(g)}
            </option>
          ))}
        </select>
        <button className="btn hover-lift !py-1.5 !text-xs" type="submit">
          Go
        </button>
      </form>

      {!gameMode && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={buildHref(baseParams, { period: p.key === "all" ? undefined : p.key, page: undefined })}
              className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                borderColor: period === p.key ? "var(--accent)" : "var(--border)",
                background: period === p.key ? "var(--bg-elev-2)" : "transparent",
                color: period === p.key ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {p.label}
            </Link>
          ))}
          {myId && (
            <Link
              href={buildHref(baseParams, { friends: friendsOnly ? undefined : "1", page: undefined })}
              className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                borderColor: friendsOnly ? "var(--accent)" : "var(--border)",
                background: friendsOnly ? "var(--bg-elev-2)" : "transparent",
                color: friendsOnly ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              Friends only
            </Link>
          )}
        </div>
      )}

      {myId && (
        <div className="mb-3 flex items-center gap-1.5">
          <Link
            href={buildHref(baseParams, { view: undefined, page: undefined })}
            className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              borderColor: !nearView ? "var(--accent)" : "var(--border)",
              background: !nearView ? "var(--bg-elev-2)" : "transparent",
              color: !nearView ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            Top players
          </Link>
          <Link
            href={buildHref(baseParams, { view: "near", page: undefined })}
            className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              borderColor: nearView ? "var(--accent)" : "var(--border)",
              background: nearView ? "var(--bg-elev-2)" : "transparent",
              color: nearView ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            Near my rank
          </Link>
        </div>
      )}

      {!nearView && (
        <form action="/leaderboard" method="get" className="mb-5">
          <input type="hidden" name="cat" value={sp.cat ?? ""} />
          <input type="hidden" name="period" value={sp.period ?? ""} />
          <input type="hidden" name="friends" value={sp.friends ?? ""} />
          <input type="hidden" name="game" value={sp.game ?? ""} />
          <input className="input" name="q" placeholder="Search by username…" defaultValue={search} />
        </form>
      )}

      {myId && myRank && !nearView && (
        <div className="panel mb-4 flex items-center gap-3 p-3">
          <span className="w-8 text-center text-sm font-black text-[var(--accent)]">#{myRank.rank}</span>
          <span className="flex-1 text-sm font-semibold">Your rank</span>
          <span className="font-mono text-sm font-bold">{gameMode ? formatHighScoreValue(gameMode, myRank.value) : myRank.value}</span>
        </div>
      )}
      {myId && !myRank && !nearView && !gameMode && period !== "all" && (
        <p className="mb-4 text-xs text-[var(--text-faint)]">
          No rated {active.label.toLowerCase()} games {period === "week" ? "this week" : "this month"} yet.
        </p>
      )}

      {displayRows.length > 0 && (
        <p className="mb-1.5 flex justify-end pr-1 text-[0.65rem] text-[var(--text-faint)]">{valueLabel}</p>
      )}

      {displayRows.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-[var(--text-muted)]">
            {nearView
              ? "Play a rated game to see your position on the board."
              : search
                ? "No players match that search."
                : friendsOnly
                  ? "None of your friends are ranked here yet."
                  : "No rated players yet — be the first on the board."}
          </p>
          {!search && !friendsOnly && !nearView && (
            <Link href="/signup" className="btn btn-primary">
              Create an account
            </Link>
          )}
        </div>
      ) : (
        <div className="panel divide-y divide-[var(--border)] overflow-hidden">
          {displayRows.map((r, i) => {
            const rank = "rank" in r && r.rank != null ? r.rank : (page - 1) * PAGE_SIZE + i + 1;
            const isMe = r.id === myId;
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elev)]"
                style={isMe ? { background: "var(--bg-elev)" } : undefined}
              >
                <span className="w-8 text-center text-sm font-black" style={{ color: rank <= 3 ? "var(--accent)" : "var(--text-faint)" }}>
                  {rank}
                </span>
                <Link href={`/u/${r.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elev-2)] text-sm font-bold">
                    {r.username[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.username}</span>
                </Link>
                <span className="font-mono text-sm font-bold">
                  {gameMode
                    ? formatHighScoreValue(gameMode, r.value)
                    : `${period !== "all" && r.value > 0 ? "+" : ""}${r.value}`}
                </span>
                {!gameMode && myId && !isMe && (
                  <Link
                    href={`/u/${r.username}#head-to-head`}
                    className="btn btn-ghost !p-1.5 !text-xs"
                    title="Head-to-head record"
                    aria-label={`Head-to-head record vs ${r.username}`}
                  >
                    ⚔️
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!nearView && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            href={buildHref(baseParams, { page: page > 1 ? String(page - 1) : undefined })}
            className={`btn hover-lift !py-1.5 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Previous
          </Link>
          <span className="text-xs text-[var(--text-faint)]">
            Page {page} of {totalPages}
          </span>
          <Link
            href={buildHref(baseParams, { page: page < totalPages ? String(page + 1) : undefined })}
            className={`btn hover-lift !py-1.5 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
