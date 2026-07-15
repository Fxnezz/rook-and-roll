import Link from "next/link";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { AdminLogoutButton } from "@/components/admin/AdminBar";
import { IconShield } from "@/components/ui/icons";
import { requireAdminOwner } from "@/lib/admin/guard";
import { SHIELD_CATEGORIES, SHIELD_FEATURES } from "@/lib/admin/shieldFeatures";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdminOwner();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const [recent, openReportCount, activeBans, activeMutes, newPlayers] = isDbConfigured
    ? await Promise.all([
        prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
        prisma.report.count({ where: { status: "OPEN" } }),
        prisma.user.count({ where: { status: { in: ["BANNED", "SUSPENDED"] }, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] } }),
        prisma.user.count({ where: { status: "MUTED", OR: [{ mutedUntil: null }, { mutedUntil: { gt: now } }] } }),
        prisma.user.count({ where: { createdAt: { gt: dayAgo } } }),
      ])
    : ([[], 0, 0, 0, 0] as [Awaited<ReturnType<typeof prisma.adminAuditLog.findMany>>, number, number, number, number]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Sam&apos;s Arcade · owner locked</p>
          <h1 className="flex items-center gap-2 text-3xl font-black"><IconShield width={26} height={26} /> Shield Command Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">50 moderation and administration workflows, protected by exact-account checks at every layer.</p>
        </div>
        <AdminLogoutButton />
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Moderation status">
        <Stat label="Open reports" value={openReportCount} alert={openReportCount > 0} />
        <Stat label="Active bans" value={activeBans} />
        <Stat label="Active mutes" value={activeMutes} />
        <Stat label="New players · 24h" value={newPlayers} />
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Player operations" note="Search, investigate, message, warn, mute, ban, restore" href="/admin/users" />
        <Card title="Live chess control" note="Attach, repair boards, clocks, results, chat, and players" href="/admin/live" />
        <Card title="Live arcade control" note="Monitor board games, clear chat, and remove players" href="/admin/live-boardgames" />
        <Card
          title="Reports & cases"
          note="Filter evidence, resolve with notes, or dismiss safely"
          href="/admin/reports"
          badge={openReportCount > 0 ? String(openReportCount) : undefined}
        />
        <Card title="Network protection" note="Review login IPs and manage network blocks" href="/admin/banned-ips" />
        <Card title="Platform operations" note="Maintenance, announcements, safety configuration" href="/admin/platform" />
        <Card title="Analytics" note="Users, games, activity, ratings, and time controls" href="/admin/analytics" />
        <Card title="Audit trail" note="Filter the append-only record of owner actions" href="/admin/audit" />
        <Card title="Access policy" note="Verify the permanent single-owner security boundary" href="/admin/admins" />
      </div>

      <section className="panel mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">50-tool coverage map</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Open the shield in the site navigation to search, filter, favorite, and revisit any workflow.</p>
          </div>
          <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-black text-[var(--accent-contrast)]">{SHIELD_FEATURES.length} active</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SHIELD_CATEGORIES.map((category) => (
            <div key={category} className="rounded-lg bg-[var(--bg-elev)] px-3 py-2">
              <div className="text-lg font-black text-[var(--accent)]">{SHIELD_FEATURES.filter((feature) => feature.category === category).length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-faint)]">{category}</div>
            </div>
          ))}
        </div>
      </section>

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
    </div>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="panel p-4">
      <div className={`text-2xl font-black ${alert ? "text-[var(--bad)]" : "text-[var(--text)]"}`}>{value}</div>
      <div className="mt-1 text-xs font-bold text-[var(--text-faint)]">{label}</div>
    </div>
  );
}

function Card({
  title,
  note,
  href,
  badge,
}: {
  title: string;
  note: string;
  href: string;
  badge?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{title}</h3>
        {badge && <span className="chip !px-1.5 !py-0.5 text-[10px]">{badge}</span>}
      </div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{note}</p>
    </>
  );
  return (
    <Link href={href} className="panel block p-4 transition-colors hover:bg-[var(--bg-elev)]">
      {inner}
    </Link>
  );
}
