import { NextResponse } from "next/server";
import { getAdminSession, clearAdminSession } from "@/lib/admin/auth";
import { audit, clientIp } from "@/lib/admin/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (await getAdminSession()) {
    await audit({ action: "admin_logout", ip: clientIp(req) });
  }
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
