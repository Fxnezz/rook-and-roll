import Link from "next/link";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { DbNotice } from "@/components/ui/DbNotice";
import { requireAdminOwner } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

function dayKey(d: Date) {
  return d.toISOString().slice(5, 10); // MM-DD
}

function bucketByDay(dates: Date[], days: number) {
  const now = Date.now();
  const buckets: { label: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    buckets.push({ label: dayKey(d), count: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.label, i]));
  for (const d of dates) {
    const i = index.get(dayKey(d));
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
}

export default async function AdminAnalyticsPage() {
  await requireAdminOwner();
  if (!isDbConfigured) return <DbNotice />;

  const now = new Date();
  const since14 = new Date(now.getTime() - 14 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since1 = new Date(now.getTime() - DAY);

  const [users, signups, games, ratings, categories, dau, mau] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({ where: { createdAt: { gt: since14 } }, select: { createdAt: true } }),
    prisma.game.findMany({ where: { createdAt: { gt: since14 } }, select: { createdAt: true } }),
    prisma.user.findMany({ select: { ratingBlitz: true } }),
    prisma.game.groupBy({ by: ["category"], _count: true }),
    prisma.loginEvent.findMany({ where: { createdAt: { gt: since1 } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.loginEvent.findMany({ where: { createdAt: { gt: since30 } }, select: { userId: true }, distinct: ["userId"] }),
  ]);

  const signupBuckets = bucketByDay(signups.map((s) => s.createdAt), 14);
  const gameBuckets = bucketByDay(games.map((g) => g.createdAt), 14);

  // rating histogram in 200-point buckets
  const hist = new Map<number, number>();
  for (const u of ratings) {
    const b = Math.floor(u.ratingBlitz / 200) * 200;
    hist.set(b, (hist.get(b) ?? 0) + 1);
  }
  const histBuckets = [...hist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, c]) => ({ label: `${b}`, count: c }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        ← Admin
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Analytics</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={users} />
        <Stat label="Games (14d)" value={games.length} />
        <Stat label="DAU" value={dau.length} />
        <Stat label="MAU" value={mau.length} />
      </div>

      <Chart title="Signups (14 days)" data={signupBuckets} color="var(--good)" />
      <Chart title="Games played (14 days)" data={gameBuckets} color="var(--accent)" />
      <Chart title="Blitz rating distribution" data={histBuckets} color="var(--info)" />

      <section className="panel mt-4 p-4">
        <span className="label">Games by time control</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <span className="text-sm text-[var(--text-faint)]">No games yet.</span>
          ) : (
            categories.map((c) => (
              <span key={c.category} className="chip capitalize">
                {c.category}: {c._count}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4 text-center">
      <div className="text-2xl font-black">{value}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}

function Chart({ title, data, color }: { title: string; data: { label: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <section className="panel mb-4 p-4">
      <span className="label">{title}</span>
      <div className="mt-3 flex h-32 items-end gap-1">
        {data.length === 0 ? (
          <span className="text-sm text-[var(--text-faint)]">No data.</span>
        ) : (
          data.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.count}`}>
              <div
                className="w-full rounded-t"
                style={{ height: `${(d.count / max) * 100}%`, background: color, minHeight: d.count ? 2 : 0 }}
              />
              <span className="text-[8px] text-[var(--text-faint)]">{d.label}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
