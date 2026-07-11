import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { computeHeadToHead } from "@/lib/db/headToHead";

export const runtime = "nodejs";

/** Bulk head-to-head record lookup for the signed-in user against a list of friend ids. */
export async function POST(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { userIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const userIds = Array.isArray(body.userIds) ? body.userIds.slice(0, 100) : [];

  const me = session.user.id;
  const entries = await Promise.all(
    userIds.map(async (id) => [id, await computeHeadToHead(me, id)] as const),
  );

  return NextResponse.json({ records: Object.fromEntries(entries) });
}
