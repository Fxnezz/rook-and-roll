import Link from "next/link";
import type { ActivityEvent } from "@/lib/db/activityFeed";

const ICONS: Record<ActivityEvent["type"], string> = {
  game: "♟️",
  achievement: "🏅",
  friend: "🤝",
};

function relativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="panel mt-4 p-4">
      <span className="label mb-3 block">Recent activity</span>
      <ul className="flex flex-col gap-2">
        {events.map((e, i) => {
          const row = (
            <div className="flex items-center gap-2 text-sm">
              <span>{ICONS[e.type]}</span>
              <span className="min-w-0 flex-1 truncate text-[var(--text-muted)]">{e.label}</span>
              <span className="shrink-0 text-xs text-[var(--text-faint)]">{relativeDate(e.date)}</span>
            </div>
          );
          return (
            <li key={i}>
              {e.href ? (
                <Link href={e.href} className="hover-lift block rounded-md px-1 py-0.5 hover:bg-[var(--bg-elev)]">
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
