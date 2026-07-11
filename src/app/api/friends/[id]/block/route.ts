import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

/** Blocks the other party on an existing friendship/request row (distinct from Remove — prevents future requests). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (friendship.requesterId !== session.user.id && friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Not your friendship to block." }, { status: 403 });
  }

  await prisma.friendship.update({
    where: { id },
    data: { status: "BLOCKED", blockedById: session.user.id },
  });
  return NextResponse.json({ ok: true });
}

/** Unblocks — removes the friendship row entirely, letting either side send a fresh request. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) return NextResponse.json({ ok: true });
  if (friendship.blockedById !== session.user.id) {
    return NextResponse.json({ error: "Only the user who blocked can unblock." }, { status: 403 });
  }

  await prisma.friendship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
