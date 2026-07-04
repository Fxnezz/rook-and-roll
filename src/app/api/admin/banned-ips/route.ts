import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ ips: [] });
  const ips = await prisma.bannedIp.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ips });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  let body: { action?: "add" | "remove"; ip?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ip = String(body.ip ?? "").trim();
  if (!ip) return NextResponse.json({ error: "IP address required" }, { status: 400 });

  if (body.action === "remove") {
    await prisma.bannedIp.delete({ where: { ip } }).catch(() => {});
    await audit({ action: "ip_unban", targetType: "ip", targetId: ip, ip: clientIp(req) });
  } else {
    const reason = body.reason?.trim().slice(0, 200) || null;
    await prisma.bannedIp.upsert({ where: { ip }, create: { ip, reason }, update: { reason } });
    await audit({ action: "ip_ban", targetType: "ip", targetId: ip, ip: clientIp(req), detail: { reason } });
  }
  return NextResponse.json({ ok: true });
}
