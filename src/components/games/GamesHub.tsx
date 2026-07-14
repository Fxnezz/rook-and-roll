"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconChevronRight, IconGrid } from "@/components/ui/icons";

export interface GameCard {
  title: string;
  blurb: string;
  emoji: string;
  links: { href: string; label: string }[];
}

export interface GameSection {
  id: "chess" | "board" | "arcade" | "original";
  title: string;
  description: string;
  games: GameCard[];
}

interface GamesHubProps {
  sections: GameSection[];
}

const FILTERS: Array<{ id: "all" | GameSection["id"]; label: string }> = [
  { id: "all", label: "All games" },
  { id: "chess", label: "Chess" },
  { id: "board", label: "Board games" },
  { id: "arcade", label: "Arcade" },
  { id: "original", label: "Originals" },
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function GameCardView({ game }: { game: GameCard }) {
  return (
    <article className="group panel flex min-h-56 flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow)]">
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elev-2)] text-2xl ring-1 ring-white/5">
            {game.emoji}
          </span>
          {game.links.length > 1 && (
            <span className="chip !px-2 !py-1 !text-[0.68rem]">{game.links.length} ways to play</span>
          )}
        </div>
        <h3 className="text-lg font-extrabold tracking-tight">{game.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-muted)]">{game.blurb}</p>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] bg-[var(--bg-elev)]/35 p-3">
        {game.links.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className={`btn min-w-0 flex-1 !px-3 !py-2 text-xs ${index === 0 ? "btn-primary" : ""}`}
          >
            {link.label}
            {index === 0 && <IconChevronRight width={14} height={14} />}
          </Link>
        ))}
      </div>
    </article>
  );
}

export function GamesHub({ sections }: GamesHubProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const totalGames = sections.reduce((total, section) => total + section.games.length, 0);
  const onlineGames = sections
    .flatMap((section) => section.games)
    .filter((game) => game.links.some((link) => link.label === "Play Online")).length;

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return sections
      .filter((section) => activeFilter === "all" || section.id === activeFilter)
      .map((section) => ({
        ...section,
        games: section.games.filter((game) => {
          if (!normalizedQuery) return true;
          return `${game.title} ${game.blurb}`.toLocaleLowerCase().includes(normalizedQuery);
        }),
      }))
      .filter((section) => section.games.length > 0);
  }, [activeFilter, query, sections]);

  const visibleGameCount = visibleSections.reduce((total, section) => total + section.games.length, 0);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,color-mix(in_srgb,var(--info)_12%,transparent),transparent_28%),radial-gradient(circle_at_20%_0%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_32%)]" />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <span className="chip mb-4"><IconGrid width={14} height={14} /> Pick your next game</span>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Games Hub</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
                Strategy, cards, puzzles, word games, and arcade classics — one place to find the mood you are in.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/80 px-4 py-3 text-center">
                <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-faint)]">Games</dt>
                <dd className="mt-1 text-xl font-black text-[var(--accent)]">{totalGames}</dd>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/80 px-4 py-3 text-center">
                <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-faint)]">Online</dt>
                <dd className="mt-1 text-xl font-black text-[var(--info)]">{onlineGames}</dd>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/80 px-4 py-3 text-center">
                <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-faint)]">Originals</dt>
                <dd className="mt-1 text-xl font-black text-[var(--good)]">2</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <section aria-label="Filter games" className="panel mb-10 p-3 sm:p-4">
          <div className="relative">
            <label htmlFor="game-search" className="sr-only">Search games</label>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]">
              <SearchIcon />
            </span>
            <input
              id="game-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or description…"
              className="input !h-12 !rounded-xl !pl-11 !pr-11 !font-sans !text-base"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--text)]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Game categories">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                aria-pressed={activeFilter === filter.id}
                className={`btn shrink-0 !rounded-full !px-4 !py-2 text-sm ${activeFilter === filter.id ? "btn-primary" : "btn-ghost"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <div className="mb-6 flex items-center justify-between gap-4">
          <p aria-live="polite" className="text-sm font-semibold text-[var(--text-muted)]">
            Showing <span className="text-[var(--text)]">{visibleGameCount}</span> {visibleGameCount === 1 ? "game" : "games"}
          </p>
          {(query || activeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveFilter("all");
              }}
              className="text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              Reset filters
            </button>
          )}
        </div>

        {visibleSections.length > 0 ? (
          visibleSections.map((section) => (
            <section key={section.id} className="mb-12 scroll-mt-24">
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{section.title}</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{section.description}</p>
                </div>
                <span className="chip shrink-0">{section.games.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.games.map((game) => <GameCardView key={game.title} game={game} />)}
              </div>
            </section>
          ))
        ) : (
          <div className="panel flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 text-4xl" aria-hidden="true">♟</span>
            <h2 className="text-xl font-extrabold">No games found</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
              Try another name, or clear the filters to browse the full collection.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveFilter("all");
              }}
              className="btn btn-primary mt-5"
            >
              Show every game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
