import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { ReplayViewer } from "@/components/game/ReplayViewer";
import { DbNotice } from "@/components/ui/DbNotice";
import { getTier } from "@/lib/engine/bots";
import type { BotTierId } from "@/lib/engine/bots";

export const dynamic = "force-dynamic";

export default async function GameReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured) return <DbNotice />;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;
  const yourColor = viewerId === game.whiteId ? "w" : viewerId === game.blackId ? "b" : undefined;
  const opponentRating =
    yourColor == null
      ? undefined
      : game.opponentType === "BOT"
        ? getTier((game.botTier ?? "cass") as BotTierId).elo
        : (yourColor === "w" ? game.blackRatingBefore : game.whiteRatingBefore) ?? undefined;

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
      <ReplayViewer
        pgn={game.pgn}
        whiteName={game.whiteName}
        blackName={game.blackName}
        moveTimes={Array.isArray(game.moveTimes) ? (game.moveTimes as number[]) : undefined}
        yourColor={yourColor}
        opponentRating={opponentRating}
        result={game.result === "ABORTED" ? undefined : game.result}
        opening={game.opening ?? undefined}
        eco={game.eco ?? undefined}
      />
    </div>
  );
}
