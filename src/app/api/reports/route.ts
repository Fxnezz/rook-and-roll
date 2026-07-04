import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

const MAX_PER_HOUR = 5;

/** Player-filed report against another player — lands in the admin Reports queue. */
export async function POST(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ error: "Not available" }, { status: 503 });

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to report a player." }, { status: 401 });

  let body: { reportedUsername?: string; reason?: string; detail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = String(body.reportedUsername ?? "").trim();
  const reason = String(body.reason ?? "").trim().slice(0, 200);
  const detail = body.detail ? String(body.detail).trim().slice(0, 1000) : null;
  if (!username || !reason) {
    return NextResponse.json({ error: "A player and a reason are required." }, { status: 400 });
  }

  const reported = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!reported) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  if (reported.id === session.user.id) {
    return NextResponse.json({ error: "You can't report yourself." }, { status: 400 });
  }

  const since = new Date(Date.now() - 3_600_000);
  const recent = await prisma.report.count({
    where: { reporterId: session.user.id, createdAt: { gt: since } },
  });
  if (recent >= MAX_PER_HOUR) {
    return NextResponse.json({ error: "Too many reports — try again later." }, { status: 429 });
  }

  await prisma.report.create({
    data: { reporterId: session.user.id, reportedId: reported.id, reason, detail },
  });
  return NextResponse.json({ ok: true });
}
