import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Only the recipient can accept this request." }, { status: 403 });
  }
  if (friendship.status !== "PENDING") {
    return NextResponse.json({ error: "This request is no longer pending." }, { status: 409 });
  }

  const updated = await prisma.friendship.update({ where: { id }, data: { status: "ACCEPTED" } });
  const requester = await prisma.user.findUnique({ where: { id: friendship.requesterId }, select: { notifyFriendRequests: true } });
  if (requester?.notifyFriendRequests) {
    await prisma.notification.create({
      data: { userId: friendship.requesterId, title: "Friend request accepted", body: `${session.user.username ?? "Someone"} accepted your friend request.` },
    });
  }

  return NextResponse.json({ ok: true, friendship: updated });
}
