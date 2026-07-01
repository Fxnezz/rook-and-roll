import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { DbNotice } from "@/components/ui/DbNotice";

export const dynamic = "force-dynamic";
export const metadata = { title: "My games — Rook & Roll" };

const RESULT_BADGE = {
  win: { label: "Win", color: "var(--good)" },
  loss: { label: "Loss", color: "var(--bad)" },
  draw: { label: "Draw", color: "var(--text-muted)" },
} as const;

export default async function GamesPage() {
  if (!isDbConfigured) return <DbNotice />;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;
  const games = await prisma.game.findMany({
    where: { OR: [{ whiteId: uid }, { blackId: uid }] },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-5 text-2xl font-bold">My games</h1>
      {games.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-[var(--text-muted)]">No games yet. Time to play!</p>
          <Link href="/play/bot" className="btn btn-primary">
            Play a bot
          </Link>
        </div>
      ) : (
        <div className="panel divide-y divide-[var(--border)] overflow-hidden">
          {games.map((g) => {
            const isWhite = g.whiteId === uid;
            const outcome =
              g.result === "DRAW"
                ? "draw"
                : (g.result === "WHITE_WINS") === isWhite
                  ? "win"
                  : "loss";
            const badge = RESULT_BADGE[outcome];
            const opponent = isWhite ? g.blackName : g.whiteName;
            return (
              <Link
                key={g.id}
                href={`/games/${g.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elev)]"
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
