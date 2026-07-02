import "server-only";
import { NextResponse } from "next/server";
import { getAdminSession } from "./auth";

/**
 * Per-route admin check. Middleware already blocks non-admins, but every admin
 * route re-verifies independently (defense in depth). Returns a 404 response to
 * return early, or null when the caller is a valid admin.
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
