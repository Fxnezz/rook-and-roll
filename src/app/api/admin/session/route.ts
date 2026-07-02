import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

// Reports only a boolean — never leaks anything useful to a non-admin.
export async function GET() {
  return NextResponse.json({ admin: await getAdminSession() });
}
