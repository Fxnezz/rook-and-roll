import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

/** Marks a single notification read. */
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const note = await prisma.notification.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  if (note.userId !== session.user.id) {
    return NextResponse.json({ error: "Not your notification." }, { status: 403 });
  }

  const updated = note.readAt ? note : await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true, notification: updated });
}

/** Dismiss (delete) a single notification. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const note = await prisma.notification.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ ok: true }); // already gone
  if (note.userId !== session.user.id) {
    return NextResponse.json({ error: "Not your notification." }, { status: 403 });
  }

  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
