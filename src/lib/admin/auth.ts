import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Admin authentication — deliberately SEPARATE from the NextAuth user session.
 * A short-lived, httpOnly, signed JWT in the `rr_admin` cookie is the only
 * thing that grants admin access, and it is verified server-side on every
 * admin route/event. The client is never trusted to assert admin status.
 */

const COOKIE = "rr_admin";
const AUDIENCE = "rr-admin";
const TTL_SECONDS = 30 * 60; // 30 minutes

function key(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("ADMIN_JWT_SECRET / AUTH_SECRET not set");
  return new TextEncoder().encode(secret);
}

/** Mint an admin token string (used by both the cookie flow and socket handoff). */
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

/** Set the admin session cookie after a successful password check. */
export async function issueAdminSession(): Promise<void> {
  const token = await mintAdminToken();
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** True iff the current request carries a valid admin cookie. Server-only. */
export async function getAdminSession(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_TTL_SECONDS = TTL_SECONDS;
