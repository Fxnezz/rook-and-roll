import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }
  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  return NextResponse.json({ game });
}

/** Toggle (or explicitly set) the `favorited` bookmark on a game the requesting user played in. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id }, select: { id: true, whiteId: true, blackId: true, favorited: true } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.whiteId !== session.user.id && game.blackId !== session.user.id) {
    return NextResponse.json({ error: "Not your game." }, { status: 403 });
  }

  let body: { favorited?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body means "toggle" */
  }
  const favorited = typeof body.favorited === "boolean" ? body.favorited : !game.favorited;

  const updated = await prisma.game.update({ where: { id }, data: { favorited }, select: { id: true, favorited: true } });
  return NextResponse.json({ ok: true, favorited: updated.favorited });
}
