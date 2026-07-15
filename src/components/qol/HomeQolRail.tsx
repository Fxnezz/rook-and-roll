"use client";

import Link from "next/link";
import { useQol } from "@/lib/qol/useQol";

export function HomeQolRail() {
  const { state, ready, openPalette, openCenter } = useQol();
  if (!ready) return null;

  const favorite = Object.values(state.favorites)[0];
  const goalPercent = Math.min(100, Math.round((state.dailyGoal.progress / state.dailyGoal.target) * 100));

  return (
    <section className="border-b border-[var(--border)] bg-[var(--bg-elev)]/25">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Your arcade</p><h2 className="mt-1 text-xl font-black">Pick up exactly where you want.</h2></div>
          <Link href="/quality-of-life" className="text-xs font-bold text-[var(--text-faint)] hover:text-[var(--accent)]">See all 200 improvements →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 qol-density-surface">
          {state.lastPlayed ? (
            <Link href={state.lastPlayed.href} className="rounded-xl border border-[var(--accent)]/35 bg-[var(--accent)]/10 p-4 hover:border-[var(--accent)]"><span className="text-[0.65rem] font-black uppercase tracking-wider text-[var(--accent)]">Continue</span><span className="mt-2 block truncate font-extrabold">{state.lastPlayed.emoji} {state.lastPlayed.label}</span></Link>
          ) : (
            <Link href="/play" className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--border-strong)]"><span className="text-[0.65rem] font-black uppercase tracking-wider text-[var(--accent)]">Discover</span><span className="mt-2 block font-extrabold">Find your first game →</span></Link>
          )}
          {favorite ? (
            <Link href={favorite.links[0]?.href} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--border-strong)]"><span className="text-[0.65rem] font-black uppercase tracking-wider text-[var(--good)]">Favorite</span><span className="mt-2 block truncate font-extrabold">{favorite.emoji} {favorite.title}</span></Link>
          ) : (
            <button type="button" onClick={() => openCenter("overview")} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-left hover:border-[var(--border-strong)]"><span className="text-[0.65rem] font-black uppercase tracking-wider text-[var(--good)]">Favorites</span><span className="mt-2 block font-extrabold">Build your go-to shelf</span></button>
          )}
          <button type="button" onClick={() => openCenter("overview")} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-left hover:border-[var(--border-strong)]"><span className="flex items-center justify-between text-[0.65rem] font-black uppercase tracking-wider text-[var(--info)]"><span>Daily goal</span><span>{goalPercent}%</span></span><span className="mt-2 block font-extrabold">{state.dailyGoal.progress} of {state.dailyGoal.target} sessions</span></button>
          <button type="button" onClick={openPalette} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-left hover:border-[var(--accent)]"><span className="text-[0.65rem] font-black uppercase tracking-wider text-[var(--accent)]">Command palette</span><span className="mt-2 flex items-center justify-between font-extrabold"><span>Find anything</span><kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[0.6rem] text-[var(--text-faint)]">⌘K</kbd></span></button>
        </div>
      </div>
    </section>
  );
}
