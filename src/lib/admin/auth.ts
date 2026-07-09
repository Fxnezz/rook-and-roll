import "server-only";
import { SignJWT, jwtVerify } from "jose";

/**
 * Admin authentication is now account-based: `/admin` is gated by the
 * signed-in NextAuth session's `isAdmin` flag (checked in src/middleware.ts
 * and src/app/admin/layout.tsx), not a shared password. This file only keeps
 * the short-lived JWT mint/verify used to hand the realtime Socket.IO server
 * proof that a request came from a verified admin session — Socket.IO can't
 * read the Next.js session cookie directly, so a fresh token bridges the two.
 */

const AUDIENCE = "rr-admin";
const TTL_SECONDS = 30 * 60; // 30 minutes

function key(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("ADMIN_JWT_SECRET / AUTH_SECRET not set");
  return new TextEncoder().encode(secret);
}

/** Mint a short-lived token for the realtime server's admin:hello handshake. Only ever called after guardAdmin() has confirmed the caller's session is isAdmin. */
export async function mintAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
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
    return payload.role === "admin";
  } catch {
    return false;
  }
}
