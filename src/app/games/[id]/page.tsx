import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { ReplayViewer } from "@/components/game/ReplayViewer";
import { DbNotice } from "@/components/ui/DbNotice";

export const dynamic = "force-dynamic";

export default async function GameReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured) return <DbNotice />;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) notFound();

  const resultText =
    game.result === "DRAW"
      ? "½–½"
      : game.result === "WHITE_WINS"
        ? "1–0"
        : game.result === "BLACK_WINS"
          ? "0–1"
          : "*";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/games" className="btn btn-ghost">
          ← My games
        </Link>
        <div className="text-right">
          <div className="font-semibold">
            {game.whiteName} <span className="font-mono text-[var(--text-muted)]">{resultText}</span> {game.blackName}
          </div>
          <div className="text-xs text-[var(--text-faint)]">
            {game.termination} · {game.category}
            {game.timeControl !== "untimed" && ` ${game.timeControl}`}
          </div>
        </div>
      </div>
      <ReplayViewer pgn={game.pgn} whiteName={game.whiteName} blackName={game.blackName} />
    </div>
  );
}
