import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const me = session.user.id;
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: me }, { addresseeId: me }] },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, username: true, name: true } },
      addressee: { select: { id: true, username: true, name: true } },
    },
  });

  const friends: { friendshipId: string; user: { id: string; username: string | null; name: string | null } }[] = [];
  const incoming: { friendshipId: string; user: { id: string; username: string | null; name: string | null }; createdAt: Date }[] = [];
  const outgoing: { friendshipId: string; user: { id: string; username: string | null; name: string | null }; createdAt: Date }[] = [];
  const blocked: { friendshipId: string; user: { id: string; username: string | null; name: string | null } }[] = [];

  for (const row of rows) {
    const other = row.requesterId === me ? row.addressee : row.requester;
    if (row.status === "ACCEPTED") {
      friends.push({ friendshipId: row.id, user: other });
    } else if (row.status === "PENDING") {
      if (row.addresseeId === me) incoming.push({ friendshipId: row.id, user: other, createdAt: row.createdAt });
      else outgoing.push({ friendshipId: row.id, user: other, createdAt: row.createdAt });
    } else if (row.status === "BLOCKED" && row.blockedById === me) {
      blocked.push({ friendshipId: row.id, user: other });
    }
  }

  return NextResponse.json({ friends, incoming, outgoing, blocked });
}
