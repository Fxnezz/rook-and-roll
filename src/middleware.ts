import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Hard gate for the admin surface. This runs BEFORE any admin page or API
 * handler, so a non-admin never reaches code that reads sensitive data — the
 * request is turned into a plain 404 (pages) or JSON 404 (API). This is the
 * real boundary; the per-route checks in the handlers are defense-in-depth.
 *
 * /api/admin/login and /api/admin/session are intentionally public — they are
 * how an admin obtains / checks a session in the first place.
 */
const AUDIENCE = "rr-admin";

function key(): Uint8Array | null {
  const secret = process.env.ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("rr_admin")?.value;
  const k = key();
  if (!token || !k) return false;
  try {
    const { payload } = await jwtVerify(token, k, { audience: AUDIENCE });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public admin endpoints (obtaining/checking a session).
  if (pathname === "/api/admin/login" || pathname === "/api/admin/session") {
    return NextResponse.next();
  }

  if (await isAdmin(req)) return NextResponse.next();

  // Not an admin → behave as if the route doesn't exist.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Rewrite to a non-existent path so Next serves the styled 404 (status 404),
  // without ever running the admin page (so no data is fetched or streamed).
  return NextResponse.rewrite(new URL("/_rr_not_found", req.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
