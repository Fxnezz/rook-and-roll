import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

/** The signed-in user's own recent login events (self-service — distinct from the admin-only lookup at /api/admin/users/[id]). */
export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ events: [] });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ events: [] });

  const events = await prisma.loginEvent.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, ip: true, userAgent: true, method: true, createdAt: true },
  });

  return NextResponse.json({ events });
}
