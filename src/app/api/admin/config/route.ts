import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";
import { getConfig, setConfig, getBroadcast } from "@/lib/admin/config";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  return NextResponse.json({
    maintenance: (await getConfig("maintenance")) === "on",
    broadcast: await getBroadcast(),
    flags: JSON.parse((await getConfig("flags")) ?? "{}"),
  });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  let body: {
    maintenance?: boolean;
    broadcast?: { message: string; level: "info" | "warning"; expiresAt: number | null } | null;
    flags?: Record<string, boolean>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.maintenance !== undefined) {
    await setConfig("maintenance", body.maintenance ? "on" : "off");
    await audit({ action: "maintenance_toggle", ip: clientIp(req), detail: { on: body.maintenance } });
  }
  if (body.broadcast !== undefined) {
    if (body.broadcast === null) {
      await setConfig("broadcast", null);
      await audit({ action: "broadcast_clear", ip: clientIp(req) });
    } else {
      const bc = { id: `bc_${Date.now().toString(36)}`, ...body.broadcast };
      await setConfig("broadcast", JSON.stringify(bc));
      await audit({ action: "broadcast_set", ip: clientIp(req), detail: bc });
    }
  }
  if (body.flags !== undefined) {
    await setConfig("flags", JSON.stringify(body.flags));
    await audit({ action: "flags_set", ip: clientIp(req), detail: body.flags });
  }

  return NextResponse.json({ ok: true });
}
