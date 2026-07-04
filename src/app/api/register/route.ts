import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json(
      { error: "Accounts are not available: the server has no database configured." },
      { status: 503 },
    );
  }

  let body: { email?: string; username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").toLowerCase().trim();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!USERNAME_RE.test(username))
    return NextResponse.json(
      { error: "Username must be 3–20 letters, numbers, or underscores." },
      { status: 400 },
    );
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  if (ip && (await prisma.bannedIp.findUnique({ where: { ip } }))) {
    // Deliberately vague — don't confirm to a banned IP that the ban is what stopped it.
    return NextResponse.json({ error: "Could not create account. Try again." }, { status: 500 });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    if (existing) {
      const field = existing.email === email ? "email" : "username";
      return NextResponse.json({ error: `That ${field} is already taken.` }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, name: username, passwordHash },
      select: { id: true, username: true },
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (e) {
    console.error("register failed", e);
    return NextResponse.json({ error: "Could not create account. Try again." }, { status: 500 });
  }
}
