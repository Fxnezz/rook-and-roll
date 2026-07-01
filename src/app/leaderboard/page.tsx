import Link from "next/link";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { DbNotice } from "@/components/ui/DbNotice";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard — Rook & Roll" };

const CATEGORIES = [
  { key: "ratingBullet", label: "Bullet", icon: "🚀" },
  { key: "ratingBlitz", label: "Blitz", icon: "⚡" },
  { key: "ratingRapid", label: "Rapid", icon: "⏱" },
  { key: "ratingClassical", label: "Classical", icon: "🏛" },
  { key: "puzzleRating", label: "Puzzles", icon: "🧩" },
] as const;

type CatKey = (typeof CATEGORIES)[number]["key"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  if (!isDbConfigured) return <DbNotice />;

  const { cat } = await searchParams;
  const active = CATEGORIES.find((c) => c.label.toLowerCase() === (cat ?? "blitz").toLowerCase()) ?? CATEGORIES[1];
  const field = active.key as CatKey;

  const players = await prisma.user.findMany({
    where: { username: { not: null } },
    orderBy: { [field]: "desc" },
    take: 25,
    select: { username: true, [field]: true, createdAt: true } as never,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Leaderboard</h1>
      <p className="mb-5 text-sm text-[var(--text-muted)]">Top rated players by time control.</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/leaderboard?cat=${c.label.toLowerCase()}`}
            className="rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{
              borderColor: c.key === field ? "var(--accent)" : "var(--border)",
              background: c.key === field ? "var(--bg-elev-2)" : "transparent",
              color: c.key === field ? "var(--text)" : "var(--text-muted)",
            }}
          >
            {c.icon} {c.label}
          </Link>
        ))}
      </div>

      {players.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-[var(--text-muted)]">No rated players yet — be the first on the board.</p>
          <Link href="/signup" className="btn btn-primary">
            Create an account
          </Link>
        </div>
      ) : (
        <div className="panel divide-y divide-[var(--border)] overflow-hidden">
          {players.map((p, i) => {
            const rating = (p as unknown as Record<CatKey, number>)[field];
            const username = (p as { username: string | null }).username ?? "—";
            return (
              <Link
                key={username + i}
                href={`/u/${username}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elev)]"
              >
                <span
                  className="w-8 text-center text-sm font-black"
                  style={{ color: i < 3 ? "var(--accent)" : "var(--text-faint)" }}
                >
                  {i + 1}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elev-2)] text-sm font-bold">
                  {username[0]?.toUpperCase()}
                </span>
                <span className="flex-1 truncate text-sm font-semibold">{username}</span>
                <span className="font-mono text-sm font-bold">{rating}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
