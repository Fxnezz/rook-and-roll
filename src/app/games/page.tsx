import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { DbNotice } from "@/components/ui/DbNotice";
import { fetchGameHistory, type CategoryFilter, type ResultFilter } from "@/lib/games/history";
import { GameFavoriteStar } from "@/components/game/GameFavoriteStar";
import { GameAccuracyBadge } from "@/components/game/GameAccuracyBadge";
import { GameImportButton } from "@/components/game/GameImportButton";
import { AnalyzeAllButton } from "@/components/game/AnalyzeAllButton";
import { IconDownload, IconStar } from "@/components/ui/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Game history" };

const RESULT_BADGE = {
  win: { label: "Win", color: "var(--good)" },
  loss: { label: "Loss", color: "var(--bad)" },
  draw: { label: "Draw", color: "var(--text-muted)" },
} as const;

const RESULT_FILTERS: { id: ResultFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "win", label: "Wins" },
  { id: "loss", label: "Losses" },
  { id: "draw", label: "Draws" },
];

const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bullet", label: "Bullet" },
  { id: "blitz", label: "Blitz" },
  { id: "rapid", label: "Rapid" },
  { id: "classical", label: "Classical" },
  { id: "untimed", label: "Untimed" },
];

function buildHref(base: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...base, ...overrides };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) q.set(k, v);
  }
  const qs = q.toString();
  return qs ? `/games?${qs}` : "/games";
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; result?: string; category?: string; cursor?: string; favorites?: string }>;
}) {
  if (!isDbConfigured) return <DbNotice />;
  const sp = await searchParams;

  const result = (RESULT_FILTERS.some((r) => r.id === sp.result) ? sp.result : "all") as ResultFilter;
  const category = (CATEGORY_FILTERS.some((c) => c.id === sp.category) ? sp.category : "all") as CategoryFilter;
  const favoritesOnly = sp.favorites === "true";

  let profileUser: { id: string; username: string } | null = null;
  if (sp.user) {
    const u = await prisma.user.findUnique({ where: { username: sp.user }, select: { id: true, username: true } });
    if (!u?.username) notFound();
    profileUser = { id: u.id, username: u.username };
  } else {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, username: true } });
    if (!u?.username) notFound();
    profileUser = { id: u.id, username: u.username };
  }

  const { games, nextCursor } = await fetchGameHistory({
    userId: profileUser.id,
    cursor: sp.cursor,
    limit: 20,
    result,
    category,
    favoritesOnly,
  });

  const baseParams = { user: sp.user, result: sp.result, category: sp.category, favorites: sp.favorites };
  const isOwn = !sp.user;
  const downloadHref = `/api/users/${profileUser.username}/games?format=pgn&result=${result}&category=${category}${favoritesOnly ? "&favorites=true" : ""}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{isOwn ? "My games" : `${profileUser.username}'s games`}</h1>
        <div className="flex gap-2">
          {isOwn && <GameImportButton />}
          {isOwn && (
            <AnalyzeAllButton games={games.filter((g) => g.accuracyW == null || g.accuracyB == null).map((g) => ({ id: g.id, pgn: g.pgn }))} />
          )}
          {games.length > 0 && (
            <a href={downloadHref} className="btn hover-lift !py-1.5 text-xs" download>
              <IconDownload width={14} height={14} /> Download all as PGN
            </a>
          )}
        </div>
      </div>
      <Link href={`/u/${profileUser.username}`} className="mb-5 inline-block text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        ← Back to profile
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex gap-1.5">
          {RESULT_FILTERS.map((r) => (
            <Link
              key={r.id}
              href={buildHref(baseParams, { result: r.id === "all" ? undefined : r.id, cursor: undefined })}
              className="hover-lift rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                borderColor: result === r.id ? "var(--accent)" : "var(--border)",
                background: result === r.id ? "var(--bg-elev-2)" : "transparent",
                color: result === r.id ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {r.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map((c) => (
            <Link
              key={c.id}
              href={buildHref(baseParams, { category: c.id === "all" ? undefined : c.id, cursor: undefined })}
              className="hover-lift rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                borderColor: category === c.id ? "var(--accent)" : "var(--border)",
                background: category === c.id ? "var(--bg-elev-2)" : "transparent",
                color: category === c.id ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {c.label}
            </Link>
          ))}
        </div>
        {isOwn && (
          <Link
            href={buildHref(baseParams, { favorites: favoritesOnly ? undefined : "true", cursor: undefined })}
            className="hover-lift flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              borderColor: favoritesOnly ? "var(--accent)" : "var(--border)",
              background: favoritesOnly ? "var(--bg-elev-2)" : "transparent",
              color: favoritesOnly ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <IconStar width={12} height={12} fill={favoritesOnly ? "currentColor" : "none"} /> Favorites only
          </Link>
        )}
      </div>

      {games.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-[var(--text-muted)]">No games match these filters.</p>
          {isOwn && (
            <Link href="/play/bot" className="btn btn-primary">
              Play a bot
            </Link>
          )}
        </div>
      ) : (
        <div className="panel divide-y divide-[var(--border)] overflow-hidden">
          {games.map((g) => {
            const isWhite = g.whiteId === profileUser!.id;
            const outcome =
              g.result === "DRAW"
                ? "draw"
                : (g.result === "WHITE_WINS") === isWhite
                  ? "win"
                  : "loss";
            const badge = RESULT_BADGE[outcome];
            const opponent = isWhite ? g.blackName : g.whiteName;
            return (
              <div key={g.id} className="flex items-center gap-1 pr-2">
                {isOwn && <GameFavoriteStar gameId={g.id} initialFavorited={g.favorited} />}
                <Link
                  href={`/games/${g.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elev)]"
                >
                  <span
                    className="w-12 shrink-0 rounded px-2 py-1 text-center text-xs font-bold"
                    style={{ color: badge.color, background: `${badge.color}18` }}
                  >
                    {badge.label}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-elev-2)] text-[10px] font-bold">
                    {isWhite ? "♔" : "♚"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">vs {opponent}</span>
                    <span className="block truncate text-xs text-[var(--text-faint)]">
                      {g.opening ? `${g.eco} ${g.opening} · ` : ""}
                      {g.termination} · {g.ply} moves
                    </span>
                  </span>
                  <span className="hidden text-right text-xs text-[var(--text-muted)] sm:block">
                    <span className="block capitalize">
                      {g.category} {g.timeControl !== "untimed" && `· ${g.timeControl}`}
                    </span>
                    <span className="block">{g.createdAt.toLocaleDateString()}</span>
                  </span>
                  {g.rated && <span className="chip !px-1.5 !py-0.5 text-[10px]">Rated</span>}
                  {g.imported && <span className="chip !px-1.5 !py-0.5 text-[10px]">Imported</span>}
                </Link>
                {isOwn && (
                  <GameAccuracyBadge gameId={g.id} pgn={g.pgn} accuracyW={g.accuracyW} accuracyB={g.accuracyB} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Link href={buildHref(baseParams, { cursor: nextCursor })} className="btn hover-lift">
            Load more
          </Link>
        </div>
      )}
    </div>
  );
}
