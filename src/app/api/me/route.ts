import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ user: null });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      ratingBullet: true,
      ratingBlitz: true,
      ratingRapid: true,
      ratingClassical: true,
      passwordHash: true,
      notifyFriendRequests: true,
      notifyFriendOnline: true,
      showOnlineStatus: true,
    },
  });
  if (!user) return NextResponse.json({ user: null });
  const { passwordHash, ...rest } = user;
  return NextResponse.json({ user: { ...rest, hasPassword: Boolean(passwordHash) } });
}

/**
 * Username or password change. Requires the current password for
 * credentials-based accounts (Google-only accounts have no passwordHash, so
 * that check is skipped for them — the OAuth session itself is proof enough
 * for a username change; password changes aren't offered to them at all).
 *
 * Either kind of change invalidates the user's session-carried claims (the
 * JWT strategy doesn't refresh custom fields mid-session), so the caller
 * should sign the user out and have them sign back in afterward.
 */
export async function PATCH(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ error: "Accounts are not available." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: {
    action?: string;
    currentPassword?: string;
    newUsername?: string;
    newPassword?: string;
    notifyFriendRequests?: boolean;
    notifyFriendOnline?: boolean;
    showOnlineStatus?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  // Notification/privacy toggles aren't security-sensitive — no password check.
  if (body.action === "preferences") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(typeof body.notifyFriendRequests === "boolean" && { notifyFriendRequests: body.notifyFriendRequests }),
        ...(typeof body.notifyFriendOnline === "boolean" && { notifyFriendOnline: body.notifyFriendOnline }),
        ...(typeof body.showOnlineStatus === "boolean" && { showOnlineStatus: body.showOnlineStatus }),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (user.passwordHash) {
    const currentPassword = String(body.currentPassword ?? "");
    if (!currentPassword) return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  if (body.action === "username") {
    const newUsername = String(body.newUsername ?? "").trim();
    if (!USERNAME_RE.test(newUsername))
      return NextResponse.json({ error: "Username must be 3–20 letters, numbers, or underscores." }, { status: 400 });
    if (newUsername === user.username) return NextResponse.json({ ok: true });
    const existing = await prisma.user.findUnique({ where: { username: newUsername } });
    if (existing) return NextResponse.json({ error: "That username is already taken." }, { status: 400 });
    await prisma.user.update({ where: { id: user.id }, data: { username: newUsername } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "password") {
    if (!user.passwordHash)
      return NextResponse.json({ error: "This account signs in with Google — there's no password to change." }, { status: 400 });
    const newPassword = String(body.newPassword ?? "");
    if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
