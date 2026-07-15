import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdminOwner } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
// Keep this branch out of search engines and the sitemap.
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/**
 * Every /admin/* page is gated here. Leaf data access and API routes repeat
 * the same exact-email check; this layout is only the first line of defense.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminOwner();
  if (!session.user) notFound();
  return <>{children}</>;
}
