import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

/** Current user's inbox. */
export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ notifications: [], unread: 0 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ notifications: [], unread: 0 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unread = notifications.filter((n) => !n.readAt).length;
  return NextResponse.json({ notifications, unread });
}

/** Mark all as read. */
export async function POST() {
  if (!isDbConfigured) return NextResponse.json({ ok: true });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
