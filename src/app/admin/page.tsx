import Link from "next/link";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { AdminLogoutButton } from "@/components/admin/AdminBar";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const recent = isDbConfigured
    ? await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 })
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-[var(--text-muted)]">Owner console · session expires in 30 min</p>
        </div>
        <AdminLogoutButton />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card title="Users" note="Manage accounts, ban, impersonate" href="/admin/users" />
        <Card title="Live games" note="God-mode tools" href="/admin/live" />
        <Card title="Platform" note="Flags & analytics" href="#" soon />
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
          Recent activity
        </div>
        {recent.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">No activity logged yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="font-mono text-xs text-[var(--accent)]">{e.action}</span>
                {e.targetType && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {e.targetType}
                    {e.targetId ? `:${e.targetId.slice(0, 8)}` : ""}
                  </span>
                )}
                <span className="ml-auto text-xs text-[var(--text-faint)]">
                  {e.ip ?? "—"} · {e.createdAt.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-[var(--text-faint)]">
        User management, live-game tools, and platform controls arrive in the next phases.
      </p>
    </div>
  );
}

function Card({ title, note, href, soon }: { title: string; note: string; href: string; soon?: boolean }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{title}</h3>
        {soon && <span className="chip !px-1.5 !py-0.5 text-[10px]">soon</span>}
      </div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{note}</p>
    </>
  );
  if (soon) return <div className="panel p-4 opacity-70">{inner}</div>;
  return (
    <Link href={href} className="panel block p-4 transition-colors hover:bg-[var(--bg-elev)]">
      {inner}
    </Link>
  );
}
