import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";

export const runtime = "nodejs";

/** Searchable / filterable audit-log viewer. */
export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ entries: [] });

  const url = new URL(req.url);
  const action = url.searchParams.get("action")?.trim();
  const targetId = url.searchParams.get("targetId")?.trim();
  const where: Prisma.AdminAuditLogWhereInput = {};
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (targetId) where.targetId = targetId;

  const entries = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ entries });
}

/** Client-initiated admin action logging (e.g. chat moderation with content). */
export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  let body: { action?: string; targetType?: string; targetId?: string; detail?: Prisma.InputJsonValue };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.action) return NextResponse.json({ error: "action required" }, { status: 400 });
  await audit({
    action: body.action.slice(0, 64),
    targetType: body.targetType,
    targetId: body.targetId,
    ip: clientIp(req),
    detail: body.detail,
  });
  return NextResponse.json({ ok: true });
}
