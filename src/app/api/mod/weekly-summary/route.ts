import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

/**
 * Best-effort weekly summary — there's no cron/scheduled-job infrastructure
 * in this project, so this is triggered client-side (useModStats) the next
 * time the moderator's stats card loads more than 7 days after the last one.
 * Reuses the existing Notification model/bell UI exactly like the admin
 * god-mode's warn action does (prisma.notification.create), just for a
 * summary instead of a single warning.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isModerator) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!isDbConfigured) return NextResponse.json({ error: "Not available" }, { status: 503 });

  let body: { actionsSinceLast?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const count = Math.max(0, Math.floor(Number(body.actionsSinceLast ?? 0)));
  if (count <= 0) return NextResponse.json({ ok: true, sent: false });

  await prisma.notification.create({
    data: {
      userId: session.user.id,
      title: "Weekly moderation summary",
      body: `You took ${count} moderation action${count === 1 ? "" : "s"} (mutes, warnings, pauses, flags) in the past week. Thanks for helping keep games friendly.`,
      fromAdmin: false,
    },
  });
  return NextResponse.json({ ok: true, sent: true });
}
