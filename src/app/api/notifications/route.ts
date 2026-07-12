import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

const PAGE_SIZE = 30;

/** Current user's inbox. `?before=<ISO createdAt>` fetches the next older page ("Load more"). */
export async function GET(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ notifications: [], unread: 0, hasMore: false });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ notifications: [], unread: 0, hasMore: false });

  const url = new URL(req.url);
  const beforeParam = url.searchParams.get("before");
  const before = beforeParam ? new Date(beforeParam) : null;

  const [page, unread] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
    }),
    // Total unread is independent of pagination — always reflects the whole inbox.
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  const hasMore = page.length > PAGE_SIZE;
  const notifications = hasMore ? page.slice(0, PAGE_SIZE) : page;
  return NextResponse.json({ notifications, unread, hasMore });
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

/** Clear all — deletes every notification in the current user's inbox. */
export async function DELETE() {
  if (!isDbConfigured) return NextResponse.json({ ok: true });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  await prisma.notification.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
