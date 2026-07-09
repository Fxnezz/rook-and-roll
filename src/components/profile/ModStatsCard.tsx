"use client";

import { useSession } from "next-auth/react";
import { useModStats } from "@/lib/moderation/useModStats";

/**
 * "My moderation stats" — only ever rendered on the designated moderator's
 * own profile. Counts are client-side-only (this browser, not account-wide;
 * see useModStats), same honesty tradeoff as the other localStorage-backed
 * moderation preferences in this feature set.
 */
export function ModStatsCard({ username }: { username: string }) {
  const { data: session } = useSession();
  const { stats, total } = useModStats();

  const isOwnProfile = session?.user?.username === username;
  const isModerator = Boolean(session?.user?.isModerator);
  if (!isOwnProfile || !isModerator) return null;

  return (
    <section className="mt-8">
      <h2 className="label mb-3">My moderation stats (this browser)</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MiniStat label="Total actions" value={total} />
        <MiniStat label="Mutes" value={stats.mutes} />
        <MiniStat label="Warnings" value={stats.warnings} />
        <MiniStat label="Pauses" value={stats.pauses} />
        <MiniStat label="Cheat flags" value={stats.cheatFlags} />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-3 text-center">
      <div className="text-2xl font-black text-[var(--accent)]">{value}</div>
      <div className="text-xs text-[var(--text-faint)]">{label}</div>
    </div>
  );
}
