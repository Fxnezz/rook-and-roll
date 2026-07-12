import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

/**
 * Best-effort weekly personal recap — same "no cron infrastructure" pattern
 * already established by src/app/api/mod/weekly-summary/route.ts: triggered
 * client-side (useWeeklyRecap) the next time the app loads more than 7 days
 * after the last check, rather than a true scheduled job.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isDbConfigured) return NextResponse.json({ error: "Not available" }, { status: 503 });

  const userId = session.user.id;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const games = await prisma.game.findMany({
    where: {
      OR: [{ whiteId: userId }, { blackId: userId }],
      NOT: { result: "ABORTED" },
      createdAt: { gte: since },
    },
    select: { result: true, whiteId: true },
  });

  if (games.length === 0) return NextResponse.json({ ok: true, sent: false });

  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const g of games) {
    if (g.result === "DRAW") draws++;
    else if ((g.result === "WHITE_WINS") === (g.whiteId === userId)) wins++;
    else losses++;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notifyGameResults: true } });
  if (user?.notifyGameResults === false) return NextResponse.json({ ok: true, sent: false });

  await prisma.notification.create({
    data: {
      userId,
      title: "Your week in review",
      body: `You played ${games.length} game${games.length === 1 ? "" : "s"} this week: ${wins}W ${losses}L ${draws}D.`,
      type: "SYSTEM",
      href: "/games",
    },
  });
  return NextResponse.json({ ok: true, sent: true });
}
