import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Hard gate for the admin surface. This runs BEFORE any admin page or API
 * handler, so a non-admin never reaches code that reads sensitive data — the
 * request is turned into a plain 404 (pages) or JSON 404 (API). This is the
 * real boundary; the per-route checks in the handlers (guardAdmin()) are
 * defense-in-depth.
 *
 * Admin access is account-based: the signed-in NextAuth session's `isAdmin`
 * claim, read directly off the session JWT (no DB round-trip needed here).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });
  if (token?.isAdmin) return NextResponse.next();

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
