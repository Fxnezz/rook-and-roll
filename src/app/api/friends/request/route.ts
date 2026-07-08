import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const username = (body.username ?? "").trim();
  if (!username) return NextResponse.json({ error: "Username required." }, { status: 400 });

  const me = session.user.id;
  const target = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true } });
  if (!target) return NextResponse.json({ error: "No user with that username." }, { status: 404 });
  if (target.id === me) return NextResponse.json({ error: "You can't friend yourself." }, { status: 400 });

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me, addresseeId: target.id },
        { requesterId: target.id, addresseeId: me },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "You're already friends." }, { status: 409 });
    }
    if (existing.status === "BLOCKED") {
      return NextResponse.json({ error: "Can't send a request to this user." }, { status: 403 });
    }
    // They already requested us — accept it instead of creating a duplicate.
    if (existing.requesterId === target.id) {
      const accepted = await prisma.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
      await prisma.notification.create({
        data: { userId: target.id, title: "Friend request accepted", body: `${session.user.username ?? "Someone"} accepted your friend request.` },
      });
      return NextResponse.json({ ok: true, friendship: accepted });
    }
    return NextResponse.json({ error: "Request already sent." }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: me, addresseeId: target.id, status: "PENDING" },
  });
  await prisma.notification.create({
    data: { userId: target.id, title: "New friend request", body: `${session.user.username ?? "Someone"} wants to be friends.` },
  });

  return NextResponse.json({ ok: true, friendship }, { status: 201 });
}
