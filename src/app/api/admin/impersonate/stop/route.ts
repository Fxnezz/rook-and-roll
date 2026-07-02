import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";
import { SESSION_COOKIE, PREV_COOKIE } from "../route";

export const runtime = "nodejs";
const PROD = process.env.NODE_ENV === "production";

/** Stop impersonating: restore the admin's prior session (if any) and log it. */
export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const jar = await cookies();
  const prev = jar.get(PREV_COOKIE)?.value;
  if (prev) {
    jar.set(SESSION_COOKIE, prev, { httpOnly: true, secure: PROD, sameSite: "lax", path: "/", maxAge: 1800 });
    jar.delete(PREV_COOKIE);
  } else {
    jar.delete(SESSION_COOKIE);
  }

  await audit({ action: "impersonate_stop", ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}
