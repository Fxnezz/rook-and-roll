"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { formatRelativeTime, useQol } from "@/lib/qol/useQol";

export function HomeQolRail() {
  const { state, ready, openPalette, openCenter } = useQol();
  if (!ready) {
    return (
      <section className="home-player-hub border-b border-[var(--border)]" aria-hidden="true">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="loading-shimmer h-44 rounded-[1.5rem] bg-[var(--bg-elev)]" />
        </div>
      </section>
    );
  }

  const favorite = Object.values(state.favorites)[0];
  const goalPercent = Math.min(100, Math.round((state.dailyGoal.progress / state.dailyGoal.target) * 100));
  const recent = state.recent.filter((item) => item.href !== "/").slice(0, 3);
  const completedGoal = state.dailyGoal.progress >= state.dailyGoal.target;

  return (
    <section className="home-player-hub border-b border-[var(--border)]" aria-labelledby="your-arcade-heading">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">Your arcade</p>
            <h2 id="your-arcade-heading" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {state.lastPlayed ? "Welcome back. Your next move is ready." : "Start a streak, not a search."}
            </h2>
          </div>
          <button type="button" onClick={openPalette} className="btn home-hub-search shrink-0 !justify-between !py-2.5 text-sm sm:min-w-48">
            <span>Find any game</span><kbd className="rounded border border-current/20 px-1.5 py-0.5 font-mono text-[0.6rem] opacity-70">⌘K</kbd>
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)] qol-density-surface">
          {state.lastPlayed ? (
            <Link href={state.lastPlayed.href} className="home-continue-card group relative min-h-48 overflow-hidden rounded-[1.5rem] border border-[var(--accent)]/35 p-5 sm:p-6">
              <span className="home-continue-glow" aria-hidden="true" />
              <span className="relative flex h-full flex-col justify-between gap-8">
                <span className="flex items-start justify-between gap-4">
                  <span>
                    <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Continue playing</span>
                    <span className="mt-2 block text-2xl font-black tracking-tight sm:text-3xl">{state.lastPlayed.emoji} {state.lastPlayed.label}</span>
                    <span className="mt-2 block text-sm text-[var(--text-muted)]">Last opened {formatRelativeTime(state.lastPlayed.visitedAt)}</span>
                  </span>
                  <span className="home-continue-arrow grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)] text-xl font-black text-[var(--accent-contrast)]">→</span>
                </span>
                <span className="flex flex-wrap gap-2 text-xs font-bold text-[var(--text-muted)]">
                  <span className="chip">Instant resume</span>
                  {state.dailyGoal.streak > 0 && <span className="chip !text-[var(--good)]">{state.dailyGoal.streak} day streak</span>}
                </span>
              </span>
            </Link>
          ) : (
            <Link href="/play" className="home-continue-card group relative min-h-48 overflow-hidden rounded-[1.5rem] border border-[var(--accent)]/35 p-5 sm:p-6">
              <span className="home-continue-glow" aria-hidden="true" />
              <span className="relative flex h-full flex-col justify-between gap-8">
                <span><span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Choose your first game</span><span className="mt-2 block text-2xl font-black tracking-tight sm:text-3xl">73 ways to play. One clean library.</span><span className="mt-2 block text-sm text-[var(--text-muted)]">Filter by pace, player count, category, or what you already love.</span></span>
                <span className="font-black text-[var(--accent)]">Explore the Games Hub →</span>
              </span>
            </Link>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <button type="button" onClick={() => openCenter("overview")} className="home-hub-tile group text-left">
              <span className="flex items-center justify-between gap-3">
                <span><span className="block text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--info)]">Today&apos;s goal</span><span className="mt-1 block text-lg font-black">{completedGoal ? "Goal complete" : `${state.dailyGoal.progress} of ${state.dailyGoal.target} sessions`}</span></span>
                <span className="home-goal-ring" style={{ "--goal": `${goalPercent * 3.6}deg` } as CSSProperties}><span>{goalPercent}%</span></span>
              </span>
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev-2)]"><span className="block h-full rounded-full bg-[var(--info)] transition-[width] duration-500" style={{ width: `${goalPercent}%` }} /></span>
            </button>
            {favorite ? (
              <Link href={favorite.links[0]?.href ?? "/play"} className="home-hub-tile group text-left"><span className="block text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--good)]">Top favorite</span><span className="mt-1 flex items-center justify-between gap-3 text-lg font-black"><span className="truncate">{favorite.emoji} {favorite.title}</span><span className="transition-transform group-hover:translate-x-1">→</span></span></Link>
            ) : (
              <button type="button" onClick={() => openCenter("collections")} className="home-hub-tile group text-left"><span className="block text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--good)]">Your favorites</span><span className="mt-1 flex items-center justify-between gap-3 text-lg font-black"><span>Build a go-to shelf</span><span className="transition-transform group-hover:translate-x-1">→</span></span></button>
            )}
          </div>
        </div>

        <div className="mt-3 flex min-w-0 flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 sm:flex-row sm:items-center">
          <span className="shrink-0 px-1 text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--text-faint)]">Recent trail</span>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 sm:pb-0">
            {recent.map((item) => <Link key={item.href} href={item.href} className="chip shrink-0 !py-2 hover:!border-[var(--accent)]"><span>{item.emoji ?? "↻"}</span><span className="max-w-40 truncate">{item.label}</span></Link>)}
            {!recent.length && <span className="px-1 text-sm text-[var(--text-faint)]">Your recent games and training pages will appear here.</span>}
          </div>
          {recent.length > 0 && <button type="button" onClick={() => openCenter("activity")} className="shrink-0 px-2 text-xs font-black text-[var(--accent)] hover:underline">View activity</button>}
        </div>
      </div>
    </section>
  );
}
