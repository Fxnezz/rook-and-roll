import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";
import { getLiveMatchConfig, setLiveMatchConfig, type LiveMatchConfig } from "@/lib/admin/liveConfig";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  return NextResponse.json({ config: await getLiveMatchConfig() });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  let patch: Partial<LiveMatchConfig>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const config = await setLiveMatchConfig(patch);
  await audit({ action: "live_config_set", ip: clientIp(req), detail: patch as unknown as Prisma.InputJsonValue });
  return NextResponse.json({ config });
}
