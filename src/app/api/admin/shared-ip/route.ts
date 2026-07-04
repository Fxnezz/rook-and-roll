import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/guard";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

/** Checks whether two users have ever logged in from the same IP — a signal for multi-accounting/collusion. */
export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ shared: [] });

  const url = new URL(req.url);
  const a = url.searchParams.get("a");
  const b = url.searchParams.get("b");
  if (!a || !b || a === b) return NextResponse.json({ shared: [] });

  const [aIps, bIps] = await Promise.all([
    prisma.loginEvent.findMany({ where: { userId: a }, select: { ip: true }, take: 50 }),
    prisma.loginEvent.findMany({ where: { userId: b }, select: { ip: true }, take: 50 }),
  ]);
  const bSet = new Set(bIps.map((e) => e.ip).filter((ip): ip is string => Boolean(ip)));
  const aValid = aIps.map((e) => e.ip).filter((ip): ip is string => Boolean(ip));
  const shared = [...new Set(aValid.filter((ip) => bSet.has(ip)))];
  return NextResponse.json({ shared });
}
