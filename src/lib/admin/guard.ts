import "server-only";
import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { isAdminOwnerEmail } from "@/lib/admin/owner";

/**
 * Per-route owner check. Proxy pre-filters requests, but every sensitive route
 * re-verifies the signed session so a stale role flag can never grant access.
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!isAdminOwnerEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** Secure page/DAL guard for Server Components that read admin data directly. */
export async function requireAdminOwner() {
  const session = await auth();
  if (!session?.user || !isAdminOwnerEmail(session.user.email)) notFound();
  return session;
}
