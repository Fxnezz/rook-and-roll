import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/guard";
import { mintAdminToken } from "@/lib/admin/auth";

export const runtime = "nodejs";

/**
 * Hands a verified admin a fresh short-lived token to authenticate to the
 * realtime server for god-mode. The realtime server verifies it with the
 * shared ADMIN_JWT_SECRET.
 */
export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  return NextResponse.json({ token: await mintAdminToken() });
}
