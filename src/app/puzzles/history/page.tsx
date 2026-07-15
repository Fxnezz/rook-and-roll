"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface HistoryEntry {
  id: string;
  puzzleId: string;
  solved: boolean;
  ratingBefore: number;
  ratingAfter: number;
  createdAt: string;
  puzzleRating: number;
  themes: string[];
}

export default function PuzzleHistoryPage() {
  const { status } = useSession();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/puzzles/history")
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.attempts ?? []);
        setHasMore(Boolean(d.hasMore));
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const loadMore = async () => {
    const last = entries[entries.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/puzzles/history?before=${encodeURIComponent(last.createdAt)}`);
      const d = await res.json();
      setEntries((prev) => [...prev, ...(d.attempts ?? [])]);
      setHasMore(Boolean(d.hasMore));
    } catch {
      /* best-effort */
    } finally {
      setLoadingMore(false);
    }
  };

  if (status === "unauthenticated") redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/puzzles" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        ← Puzzles
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-bold">Puzzle attempt history</h1>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No recorded attempts yet.</p>
      ) : (
        <div className="panel divide-y divide-[var(--border)] overflow-hidden">
          {entries.map((h) => {
            const delta = h.ratingAfter - h.ratingBefore;
            return (
              <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className={h.solved ? "text-[var(--good)]" : "text-[var(--bad)]"}>{h.solved ? "Solved" : "Missed"}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-faint)]">
                  {h.themes.slice(0, 2).map((t) => t.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ")}
                </span>
                <span className="shrink-0 text-xs text-[var(--text-faint)]">{h.puzzleRating} rated</span>
                <span className="shrink-0 text-xs text-[var(--text-faint)]">{new Date(h.createdAt).toLocaleDateString()}</span>
                <span className={`shrink-0 text-xs font-semibold ${delta >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                  {delta >= 0 ? `+${delta}` : delta}
                </span>
              </div>
            );
          })}
          {hasMore && (
            <button
              className="w-full px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] disabled:opacity-50"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
