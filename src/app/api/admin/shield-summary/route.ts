import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/guard";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const [openReports, activeBans, activeMutes, newPlayers, recentActions] = await Promise.all([
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.user.count({
      where: {
        status: { in: ["BANNED", "SUSPENDED"] },
        OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
      },
    }),
    prisma.user.count({
      where: {
        status: "MUTED",
        OR: [{ mutedUntil: null }, { mutedUntil: { gt: now } }],
      },
    }),
    prisma.user.count({ where: { createdAt: { gt: dayAgo } } }),
    prisma.adminAuditLog.count({ where: { createdAt: { gt: dayAgo } } }),
  ]);

  return NextResponse.json({ openReports, activeBans, activeMutes, newPlayers, recentActions });
}
