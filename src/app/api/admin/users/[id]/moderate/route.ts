import { NextResponse } from "next/server";
import type { Prisma, UserStatus } from "@prisma/client";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";

export const runtime = "nodejs";

type Action = "ban" | "unban" | "mute" | "unmute" | "suspend";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const { id } = await ctx.params;
  let body: { action?: Action; reason?: string; durationHours?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = body.action;
  const reason = body.reason?.slice(0, 500) ?? null;
  const until =
    body.durationHours && body.durationHours > 0
      ? new Date(Date.now() + body.durationHours * 3_600_000)
      : null;

  const data: Prisma.UserUpdateInput = {};
  switch (action) {
    case "ban":
      data.status = "BANNED" as UserStatus;
      data.moderationReason = reason;
      data.bannedUntil = until; // null = permanent
      break;
    case "suspend":
      data.status = "SUSPENDED" as UserStatus;
      data.moderationReason = reason;
      data.bannedUntil = until;
      break;
    case "unban":
      data.status = "ACTIVE" as UserStatus;
      data.moderationReason = null;
      data.bannedUntil = null;
      break;
    case "mute":
      data.status = "MUTED" as UserStatus;
      data.moderationReason = reason;
      data.mutedUntil = until;
      break;
    case "unmute":
      data.status = "ACTIVE" as UserStatus;
      data.mutedUntil = null;
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, status: true, bannedUntil: true, mutedUntil: true },
    });
    await audit({
      action: `user_${action}`,
      targetType: "user",
      targetId: id,
      ip: clientIp(req),
      detail: { username: user.username, reason, until: until?.toISOString() ?? null },
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
