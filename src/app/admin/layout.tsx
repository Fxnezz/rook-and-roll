import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";
// Keep this branch out of search engines and the sitemap.
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/**
 * Every /admin/* page is gated here. Non-admins get a plain 404 — no login
 * page, no hint that an admin area exists. Access is account-based: the
 * signed-in session must have isAdmin=true (see src/app/admin/admins/page.tsx
 * for how that flag is granted/revoked).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.isAdmin) notFound();
  return <>{children}</>;
}
