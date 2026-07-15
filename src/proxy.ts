import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminOwnerEmail } from "@/lib/admin/owner";

/**
 * Fast optimistic pre-filter for the private Shield surface. Secure checks are
 * repeated in Server Components and Route Handlers close to the data/action.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });
  if (isAdminOwnerEmail(typeof token?.email === "string" ? token.email : null)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.rewrite(new URL("/_rr_not_found", req.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
