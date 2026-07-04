import { NextResponse } from "next/server";
import type { ReportStatus } from "@prisma/client";
import { guardAdmin } from "@/lib/admin/guard";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = new Set<ReportStatus>(["OPEN", "RESOLVED", "DISMISSED"]);

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ reports: [], openCount: 0 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") ?? "OPEN";
  const where = statusParam === "ALL" || !VALID_STATUSES.has(statusParam as ReportStatus) ? {} : { status: statusParam as ReportStatus };

  const [reports, openCount] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reporter: { select: { username: true } },
        reported: { select: { id: true, username: true, status: true } },
      },
    }),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);

  return NextResponse.json({ reports, openCount });
}
