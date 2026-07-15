"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { IconShield } from "@/components/ui/icons";
import { SHIELD_CATEGORIES, SHIELD_FEATURES, type ShieldCategory } from "@/lib/admin/shieldFeatures";

const FAVORITES_KEY = "sams-arcade:shield-favorites:v1";
const RECENTS_KEY = "sams-arcade:shield-recents:v1";
const CATEGORY_FILTERS = ["All", "Favorites", ...SHIELD_CATEGORIES] as const;

interface Summary {
  openReports: number;
  activeBans: number;
  activeMutes: number;
  newPlayers: number;
  recentActions: number;
}

function readIds(key: string): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

export function ShieldCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ShieldCategory | "All" | "Favorites">("All");
  const [favorites, setFavorites] = useState<number[]>(() => (typeof window === "undefined" ? [] : readIds(FAVORITES_KEY)));
  const [recents, setRecents] = useState<number[]>(() => (typeof window === "undefined" ? [] : readIds(RECENTS_KEY)));
  const [summary, setSummary] = useState<Summary | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => searchRef.current?.focus(), 120);
    fetch("/api/admin/shield-summary", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setSummary(data))
      .catch(() => {});
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SHIELD_FEATURES.filter((feature) => {
      if (category === "Favorites" && !favorites.includes(feature.id)) return false;
      if (category !== "All" && category !== "Favorites" && feature.category !== category) return false;
      if (!needle) return true;
      return `${feature.title} ${feature.description} ${feature.category} ${feature.keywords}`.toLowerCase().includes(needle);
    });
  }, [category, favorites, query]);

  const toggleFavorite = (id: number) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [id, ...current];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const recordRecent = (id: number) => {
    setRecents((current) => {
      const next = [id, ...current.filter((value) => value !== id)].slice(0, 6);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
    onClose();
  };

  const recentFeatures = recents
    .map((id) => SHIELD_FEATURES.find((feature) => feature.id === id))
    .filter((feature) => feature !== undefined);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Shield Center · 50 tools"
      footer={
        <Link href="/admin" prefetch={false} onClick={onClose} className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-[var(--accent)] hover:bg-[var(--bg-elev)]">
          <IconShield width={16} height={16} /> Open full command center
        </Link>
      }
    >
      <div className="border-b border-[var(--border)] p-3">
        <div className="mb-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent)]">Owner locked</p>
              <p className="mt-1 text-sm font-semibold">Only sbyrnes1@student.johnxxiii.edu.au</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)]">
              <IconShield width={20} height={20} />
            </span>
          </div>
        </div>

        <label className="block">
          <span className="sr-only">Search Shield tools</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input !font-sans"
            placeholder="Search 50 moderation tools…"
          />
        </label>

        {summary && (
          <div className="mt-3 grid grid-cols-5 gap-1" aria-label="Live moderation summary">
            <SummaryStat label="Reports" value={summary.openReports} alert={summary.openReports > 0} />
            <SummaryStat label="Bans" value={summary.activeBans} />
            <SummaryStat label="Mutes" value={summary.activeMutes} />
            <SummaryStat label="New 24h" value={summary.newPlayers} />
            <SummaryStat label="Actions" value={summary.recentActions} />
          </div>
        )}
      </div>

      <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] p-2" aria-label="Shield tool categories">
        {CATEGORY_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors ${category === item ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--bg-elev)] text-[var(--text-muted)] hover:text-[var(--text)]"}`}
          >
            {item === "Favorites" ? `★ ${item}` : item}
          </button>
        ))}
      </div>

      <div className="p-3">
        {!query && category === "All" && recentFeatures.length > 0 && (
          <section className="mb-4" aria-labelledby="recent-shield-tools">
            <h3 id="recent-shield-tools" className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-faint)]">Recent tools</h3>
            <div className="flex flex-wrap gap-1.5">
              {recentFeatures.map((feature) => (
                <Link key={feature.id} href={feature.href} prefetch={false} onClick={() => recordRecent(feature.id)} className="rounded-lg bg-[var(--bg-elev)] px-2.5 py-1.5 text-xs font-semibold hover:text-[var(--accent)]">
                  {feature.id}. {feature.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-faint)]">{category} tools</h3>
          <span className="text-xs font-semibold text-[var(--text-faint)]">{filtered.length} shown</span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No Shield tools match that search.
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((feature) => (
              <article key={feature.id} className="group relative rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev)]">
                <Link href={feature.href} prefetch={false} onClick={() => recordRecent(feature.id)} className="block pr-8">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 min-w-6 place-items-center rounded-md bg-[var(--accent)]/12 px-1 text-[10px] font-black text-[var(--accent)]">{feature.id}</span>
                    <h4 className="text-sm font-bold">{feature.title}</h4>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">{feature.description}</p>
                  <span className="mt-2 inline-flex rounded-full bg-[var(--bg-elev-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-faint)]">{feature.category}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFavorite(feature.id)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-lg text-[var(--text-faint)] hover:bg-[var(--panel)] hover:text-[var(--accent)]"
                  aria-label={`${favorites.includes(feature.id) ? "Remove" : "Add"} ${feature.title} ${favorites.includes(feature.id) ? "from" : "to"} favorites`}
                  aria-pressed={favorites.includes(feature.id)}
                  title={favorites.includes(feature.id) ? "Remove favorite" : "Add favorite"}
                >
                  {favorites.includes(feature.id) ? "★" : "☆"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </SlideOver>
  );
}

function SummaryStat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--bg)] px-1 py-2 text-center">
      <div className={`text-sm font-black ${alert ? "text-[var(--bad)]" : "text-[var(--text)]"}`}>{value}</div>
      <div className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
    </div>
  );
}
