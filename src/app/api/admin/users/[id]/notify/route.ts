import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";

export const runtime = "nodejs";

/** Send a direct admin message to a user's in-app inbox. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const { id } = await ctx.params;
  let body: { title?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const title = String(body.title ?? "Message from the team").slice(0, 120);
  const bodyText = String(body.message ?? "").slice(0, 2000);
  if (!bodyText) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  try {
    await prisma.notification.create({
      data: { userId: id, title, body: bodyText, fromAdmin: true },
    });
    await audit({ action: "user_notify", targetType: "user", targetId: id, ip: clientIp(req), detail: { title } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
