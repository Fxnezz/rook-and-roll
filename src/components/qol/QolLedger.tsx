"use client";

import { useMemo, useState } from "react";
import { QOL_FEATURES, QOL_IMPROVEMENT_COUNT, QOL_SYSTEM_COUNT, type QolFeatureGroup } from "@/lib/qol/features";

type Category = "All" | QolFeatureGroup["category"];

const CATEGORIES: Category[] = ["All", "Navigate", "Discover", "Organize", "Focus", "Access", "Reliability"];

export function QolLedger() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [expanded, setExpanded] = useState<string[]>(QOL_FEATURES.slice(0, 3).map((feature) => feature.id));

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return QOL_FEATURES.filter((feature) => {
      if (category !== "All" && feature.category !== category) return false;
      if (!normalized) return true;
      return `${feature.title} ${feature.summary} ${feature.enhancements.join(" ")}`.toLowerCase().includes(normalized);
    });
  }, [category, query]);

  const visibleCount = visible.reduce((total, feature) => total + 1 + feature.enhancements.length, 0);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,color-mix(in_srgb,var(--good)_12%,transparent),transparent_28%),radial-gradient(circle_at_82%_0%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_34%)]" />
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <span className="chip mb-5 !border-[var(--good)]/30 !bg-[var(--good)]/10 !text-[var(--good)]">✓ Shipped and active</span>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">100 quality-of-life improvements.</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">Not a list of renamed buttons: {QOL_SYSTEM_COUNT} substantial player systems, each finished with three supporting refinements.</p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-4 text-center"><dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">Systems</dt><dd className="mt-1 text-4xl font-black text-[var(--accent)]">{QOL_SYSTEM_COUNT}</dd></div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-4 text-center"><dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">Improvements</dt><dd className="mt-1 text-4xl font-black text-[var(--good)]">{QOL_IMPROVEMENT_COUNT}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <section className="panel p-4">
          <label className="sr-only" htmlFor="qol-search">Search improvements</label>
          <input id="qol-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="input !h-12 !font-sans !text-base" placeholder="Search systems and refinements…" />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`btn shrink-0 !rounded-full !px-4 !py-2 text-xs ${category === item ? "btn-primary" : "btn-ghost"}`}>{item}</button>)}
          </div>
        </section>

        <div className="my-6 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[var(--text-muted)]">Showing <strong className="text-[var(--text)]">{visibleCount}</strong> improvements</p>
          {(query || category !== "All") && <button type="button" onClick={() => { setQuery(""); setCategory("All"); }} className="text-sm font-bold text-[var(--accent)]">Reset filters</button>}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((feature) => {
            const isExpanded = expanded.includes(feature.id);
            const number = QOL_FEATURES.findIndex((item) => item.id === feature.id) + 1;
            return (
              <article key={feature.id} className="panel overflow-hidden">
                <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => current.includes(feature.id) ? current.filter((id) => id !== feature.id) : [...current, feature.id])} className="flex w-full items-start gap-4 p-5 text-left">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 font-mono text-sm font-black text-[var(--accent)]">{String(number).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-lg font-extrabold">{feature.title}</span><span className="chip !px-2 !py-1 !text-[0.6rem]">{feature.category}</span></span><span className="mt-1 block text-sm leading-6 text-[var(--text-muted)]">{feature.summary}</span></span>
                  <span className="mt-2 text-[var(--text-faint)]">{isExpanded ? "−" : "+"}</span>
                </button>
                {isExpanded && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg)]/35 px-5 py-4">
                    <p className="mb-3 text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--text-faint)]">Three supporting refinements</p>
                    <ol className="space-y-2">
                      {feature.enhancements.map((enhancement, index) => (
                        <li key={enhancement} className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--good)]/15 text-[0.65rem] font-black text-[var(--good)]">{index + 1}</span>{enhancement}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!visible.length && <div className="panel grid min-h-56 place-items-center p-8 text-center"><div><p className="text-xl font-extrabold">No improvement matches that search.</p><button type="button" className="btn btn-primary mt-4" onClick={() => { setQuery(""); setCategory("All"); }}>Show all 100</button></div></div>}
      </div>
    </div>
  );
}
