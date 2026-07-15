import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { ADMIN_OWNER_EMAIL, isAdminOwnerEmail } from "@/lib/admin/owner";

/**
 * `/admin` is gated by the exact owner email in the proxy, DAL, and route
 * handlers. This file keeps the short-lived JWT used to prove that same owner
 * identity to Socket.IO, which cannot read the NextAuth cookie directly.
 */

const AUDIENCE = "rr-admin";
const TTL_SECONDS = 30 * 60; // 30 minutes

function key(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("ADMIN_JWT_SECRET / AUTH_SECRET not set");
  return new TextEncoder().encode(secret);
}

/** Mint a short-lived token after guardAdmin() confirms the exact owner. */
export async function mintAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin", email: ADMIN_OWNER_EMAIL })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .setAudience(AUDIENCE)
    .sign(key());
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: AUDIENCE });
    return payload.role === "admin" && isAdminOwnerEmail(typeof payload.email === "string" ? payload.email : null);
  } catch {
    return false;
  }
}
