import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
// Keep this branch out of search engines and the sitemap.
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/**
 * Every /admin/* page is gated here. Non-admins get a plain 404 — no login
 * page, no hint that an admin area exists. The only way in is the server-side
 * password check that sets the admin cookie.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await getAdminSession())) notFound();
  return <>{children}</>;
}
