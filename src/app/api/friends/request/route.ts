import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

const DECLINE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { username?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const username = (body.username ?? "").trim();
  if (!username) return NextResponse.json({ error: "Username required." }, { status: 400 });
  const note = (body.note ?? "").trim().slice(0, 200) || null;

  const me = session.user.id;
  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, notifyFriendRequests: true, autoDeclineFriendRequests: true },
  });
  if (!target) return NextResponse.json({ error: "No user with that username." }, { status: 404 });
  if (target.id === me) return NextResponse.json({ error: "You can't friend yourself." }, { status: 400 });
  if (target.autoDeclineFriendRequests) {
    return NextResponse.json({ error: "This user isn't accepting friend requests right now." }, { status: 403 });
  }

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
    if (existing.status === "DECLINED") {
      const elapsed = Date.now() - (existing.declinedAt?.getTime() ?? 0);
      if (elapsed < DECLINE_COOLDOWN_MS) {
        const hoursLeft = Math.ceil((DECLINE_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
        return NextResponse.json({ error: `This request was recently declined. Try again in ${hoursLeft}h.` }, { status: 429 });
      }
      // Cooldown elapsed — reuse the row as a fresh request from me.
      const friendship = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "PENDING", requesterId: me, addresseeId: target.id, declinedAt: null, createdAt: new Date(), note },
      });
      if (target.notifyFriendRequests) {
        await prisma.notification.create({
          data: {
            userId: target.id,
            title: "New friend request",
            body: `${session.user.username ?? "Someone"} wants to be friends.`,
            type: "FRIEND_REQUEST",
            href: "/friends",
          },
        });
      }
      return NextResponse.json({ ok: true, friendship }, { status: 201 });
    }
    // They already requested us — accept it instead of creating a duplicate.
    if (existing.requesterId === target.id) {
      const accepted = await prisma.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
      if (target.notifyFriendRequests) {
        await prisma.notification.create({
          data: {
            userId: target.id,
            title: "Friend request accepted",
            body: `${session.user.username ?? "Someone"} accepted your friend request.`,
            type: "FRIEND_ACCEPTED",
            href: session.user.username ? `/u/${session.user.username}` : "/friends",
          },
        });
      }
      return NextResponse.json({ ok: true, friendship: accepted });
    }
    return NextResponse.json({ error: "Request already sent." }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: me, addresseeId: target.id, status: "PENDING", note },
  });
  if (target.notifyFriendRequests) {
    await prisma.notification.create({
      data: {
        userId: target.id,
        title: "New friend request",
        body: `${session.user.username ?? "Someone"} wants to be friends.`,
        type: "FRIEND_REQUEST",
        href: "/friends",
      },
    });
  }

  return NextResponse.json({ ok: true, friendship }, { status: 201 });
}
