import { jwtVerify } from "jose";
import { OWNER_EMAIL } from "./ownerAccount.js";

/**
 * Verifies the short-lived admin token minted by the Next.js app
 * (src/lib/admin/auth.ts). Both services must share ADMIN_JWT_SECRET (or fall
 * back to AUTH_SECRET). Every admin socket event is checked with this.
 */
function key(): Uint8Array | null {
  const secret = process.env.ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  const k = key();
  if (!k || !token) return false;
  try {
    const { payload } = await jwtVerify(token, k, { audience: "rr-admin" });
    return payload.role === "admin" && payload.email === OWNER_EMAIL;
  } catch {
    return false;
  }
}
