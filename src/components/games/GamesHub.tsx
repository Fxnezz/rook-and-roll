"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronRight, IconGrid } from "@/components/ui/icons";
import { formatRelativeTime, useQol, type QolGame } from "@/lib/qol/useQol";

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

type CategoryFilter = "all" | GameSection["id"];
type ModeFilter = "all" | "online" | "bot" | "local" | "solo";
type PaceFilter = "all" | QolGame["pace"];
type SortMode = "recommended" | "favorites" | "most-played" | "recent" | "az";

const FILTERS: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "All games" },
  { id: "chess", label: "Chess" },
  { id: "board", label: "Board games" },
  { id: "arcade", label: "Arcade" },
  { id: "original", label: "Originals" },
];

const DEEP_GAMES = new Set([
  "Chess",
  "World Cup 7-0",
  "Football 38-0",
  "NBA 82-0",
  "AFL 23-0",
  "Go",
  "Amazons",
  "Fanorona",
  "Lines of Action",
  "Nine Men's Morris",
  "Ultimate Tic-Tac-Toe",
  "Quoridor",
  "Hex",
]);
const QUICK_GAMES = new Set([
  "Tic-Tac-Toe",
  "Connect Four",
  "Nim",
  "Snake",
  "2048",
  "Pong",
  "Breakout",
  "Wordle",
  "Rock Paper Scissors",
  "Slot Machine",
  "Whack-a-Mole",
]);

function paceFor(game: GameCard, section: GameSection["id"]): QolGame["pace"] {
  if (DEEP_GAMES.has(game.title)) return "deep";
  if (QUICK_GAMES.has(game.title) || section === "arcade") return "quick";
  return "medium";
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

function hasMode(game: QolGame, mode: Exclude<ModeFilter, "all">): boolean {
  const labels = game.links.map((link) => `${link.label} ${link.href}`.toLowerCase());
  if (mode === "online") return labels.some((label) => label.includes("online"));
  if (mode === "bot") return labels.some((label) => label.includes("bot"));
  if (mode === "local") return labels.some((label) => label.includes("local") || label.includes("pass"));
  return !hasMode(game, "online") && !hasMode(game, "bot") && !hasMode(game, "local");
}

function scoreRecommendation(
  game: QolGame,
  favorites: Record<string, QolGame>,
  playCounts: Record<string, number>,
  recentHrefs: ReadonlySet<string>,
): number {
  const href = game.links[0]?.href;
  const plays = playCounts[href] ?? 0;
  const favoriteBoost = favorites[href] ? 50 : 0;
  const recentBoost = recentHrefs.has(href) ? 15 : 0;
  const varietyBoost = Math.max(0, 12 - plays);
  return favoriteBoost + recentBoost + plays * 4 + varietyBoost;
}

function GameCardView({
  game,
  favorite,
  compared,
  compareFull,
  playCount,
  onFavorite,
  onQuickView,
  onCompare,
}: {
  game: QolGame;
  favorite: boolean;
  compared: boolean;
  compareFull: boolean;
  playCount: number;
  onFavorite: () => void;
  onQuickView: () => void;
  onCompare: () => void;
}) {
  return (
    <article
      data-game-card
      data-category={game.category}
      className="group panel flex min-h-56 flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow)]"
    >
      <div className="game-visual" aria-hidden="true">
        <span className="game-visual-icon">{game.emoji}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[0.66rem] font-black uppercase tracking-[0.13em] text-[var(--text-faint)]">{game.pace} pace</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onFavorite}
              aria-label={favorite ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
              aria-pressed={favorite}
              className={`grid h-9 w-9 place-items-center rounded-lg border transition ${favorite ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-faint)] hover:text-[var(--accent)]"}`}
            >
              <HeartIcon filled={favorite} />
            </button>
            {game.links.length > 1 && <span className="chip !px-2 !py-1 !text-[0.68rem]">{game.links.length} modes</span>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold tracking-tight">{game.title}</h3>
          {playCount > 0 && <span className="shrink-0 text-[0.65rem] font-bold text-[var(--text-faint)]">{playCount} {playCount === 1 ? "play" : "plays"}</span>}
        </div>
        <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-muted)]">{game.blurb}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onQuickView} className="btn flex-1 !py-2 text-xs">Quick view</button>
          <button
            type="button"
            onClick={onCompare}
            disabled={!compared && compareFull}
            aria-pressed={compared}
            className={`btn !px-3 !py-2 text-xs ${compared ? "btn-good" : "btn-ghost"}`}
          >
            {compared ? "Compared" : "Compare"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] bg-[var(--bg-elev)]/35 p-3">
        {game.links.map((link, index) => (
          <Link key={link.href} href={link.href} className={`btn min-w-0 flex-1 !px-3 !py-2 text-xs ${index === 0 ? "btn-primary" : ""}`}>
            {link.label}
            {index === 0 && <IconChevronRight width={14} height={14} />}
          </Link>
        ))}
      </div>
    </article>
  );
}

function GameQuickView({ game, onClose }: { game: QolGame; onClose: () => void }) {
  const { state, toggleFavorite, toggleCollectionGame } = useQol();
  const href = game.links[0]?.href;
  const favorite = Boolean(state.favorites[href]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/65 p-3 backdrop-blur-sm" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="quick-view-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-4 border-b border-[var(--border)] p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--bg-elev-2)] text-3xl">{game.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{game.category} · {game.pace} pace</p>
            <h2 id="quick-view-title" className="mt-1 text-2xl font-black">{game.title}</h2>
          </div>
          <button type="button" className="btn btn-ghost !p-2" onClick={onClose} aria-label="Close quick view">×</button>
        </div>
        <div className="space-y-5 p-5">
          <p className="leading-7 text-[var(--text-muted)]">{game.blurb}</p>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">Ways to play</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {game.links.map((link, index) => (
                <Link key={link.href} href={link.href} onClick={onClose} className={`btn !justify-between ${index === 0 ? "btn-primary" : ""}`}>{link.label}<span>→</span></Link>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={`btn ${favorite ? "btn-good" : ""}`} onClick={() => toggleFavorite(game)}><HeartIcon filled={favorite} /> {favorite ? "Favorited" : "Favorite"}</button>
            <button type="button" className="btn" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${href}`); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}>⧉ {copied ? "Copied" : "Copy link"}</button>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">Collections</p>
            {state.collections.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {state.collections.map((collection) => {
                  const checked = collection.gameHrefs.includes(href);
                  return (
                    <label key={collection.id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold">
                      <input type="checkbox" checked={checked} onChange={() => toggleCollectionGame(collection.id, href)} className="h-4 w-4 accent-[var(--accent)]" />
                      <span className="truncate">{collection.name}</span>
                    </label>
                  );
                })}
              </div>
            ) : <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-faint)]">Create a collection from Player Tools, then save this game to it.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

export function GamesHub({ sections }: GamesHubProps) {
  const {
    state,
    registerGames,
    toggleFavorite,
    addSearch,
    clearSearchHistory,
    setLastSurprise,
  } = useQol();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [paceFilter, setPaceFilter] = useState<PaceFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<QolGame | null>(null);
  const [compareHrefs, setCompareHrefs] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const games = useMemo<QolGame[]>(() => sections.flatMap((section) => section.games.map((game) => ({
    ...game,
    category: section.id,
    pace: paceFor(game, section.id),
  }))), [sections]);

  useEffect(() => registerGames(games), [games, registerGames]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const recentHrefs = useMemo(() => new Set(state.recent.map((item) => item.href)), [state.recent]);

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return sections
      .filter((section) => activeFilter === "all" || section.id === activeFilter)
      .map((section) => {
        const sectionGames = games
          .filter((game) => game.category === section.id)
          .filter((game) => {
            const href = game.links[0]?.href;
            if (normalizedQuery && !`${game.title} ${game.blurb} ${game.links.map((link) => link.label).join(" ")} ${game.pace}`.toLowerCase().includes(normalizedQuery)) return false;
            if (modeFilter !== "all" && !hasMode(game, modeFilter)) return false;
            if (paceFilter !== "all" && game.pace !== paceFilter) return false;
            if (favoritesOnly && !state.favorites[href]) return false;
            return true;
          })
          .sort((a, b) => {
            const aHref = a.links[0]?.href;
            const bHref = b.links[0]?.href;
            if (sortMode === "az") return a.title.localeCompare(b.title);
            if (sortMode === "favorites") return Number(Boolean(state.favorites[bHref])) - Number(Boolean(state.favorites[aHref])) || a.title.localeCompare(b.title);
            if (sortMode === "most-played") return (state.playCounts[bHref] ?? 0) - (state.playCounts[aHref] ?? 0) || a.title.localeCompare(b.title);
            if (sortMode === "recent") {
              const aVisit = state.recent.find((item) => item.href === aHref)?.visitedAt ?? 0;
              const bVisit = state.recent.find((item) => item.href === bHref)?.visitedAt ?? 0;
              return bVisit - aVisit || a.title.localeCompare(b.title);
            }
            return scoreRecommendation(b, state.favorites, state.playCounts, recentHrefs) - scoreRecommendation(a, state.favorites, state.playCounts, recentHrefs) || a.title.localeCompare(b.title);
          });
        return { ...section, games: sectionGames };
      })
      .filter((section) => section.games.length > 0);
  }, [activeFilter, favoritesOnly, games, modeFilter, paceFilter, query, recentHrefs, sections, sortMode, state.favorites, state.playCounts, state.recent]);

  const visibleGames = visibleSections.flatMap((section) => section.games);
  const totalGames = games.length;
  const onlineGames = games.filter((game) => hasMode(game, "online")).length;
  const compareGames = compareHrefs.map((href) => games.find((game) => game.links[0]?.href === href)).filter(Boolean) as QolGame[];
  const recommended = [...games].sort((a, b) => scoreRecommendation(b, state.favorites, state.playCounts, recentHrefs) - scoreRecommendation(a, state.favorites, state.playCounts, recentHrefs))[0];
  const hasActiveFilters = Boolean(query || activeFilter !== "all" || modeFilter !== "all" || paceFilter !== "all" || favoritesOnly || sortMode !== "recommended");
  const advancedFilterCount = [modeFilter !== "all", paceFilter !== "all", favoritesOnly, sortMode !== "recommended"].filter(Boolean).length;

  const resetFilters = () => {
    setQuery("");
    setActiveFilter("all");
    setModeFilter("all");
    setPaceFilter("all");
    setFavoritesOnly(false);
    setSortMode("recommended");
    setAdvancedFiltersOpen(false);
  };

  const surprise = () => {
    const pool = visibleGames.length ? visibleGames : games;
    const withoutRepeat = pool.filter((game) => game.links[0]?.href !== state.lastSurpriseHref);
    const choices = withoutRepeat.length ? withoutRepeat : pool;
    const pick = choices[Math.floor(Math.random() * choices.length)];
    if (!pick) return;
    setLastSurprise(pick.links[0]?.href);
    setSelectedGame(pick);
  };

  const toggleCompare = (href: string) => {
    setCompareHrefs((current) => current.includes(href) ? current.filter((item) => item !== href) : current.length < 3 ? [...current, href] : current);
  };

  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,color-mix(in_srgb,var(--info)_12%,transparent),transparent_28%),radial-gradient(circle_at_20%_0%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_32%)]" />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <span className="chip mb-4"><IconGrid width={14} height={14} /> Personalized game discovery</span>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Games Hub</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">Find a game quickly, or fine-tune the library when you need more control.</p>
            </div>
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              {[["Games", totalGames, "var(--accent)"], ["Online", onlineGames, "var(--info)"], ["Favorites", Object.keys(state.favorites).length, "var(--good)"]].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/80 px-4 py-3 text-center">
                  <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-faint)]">{label}</dt>
                  <dd className="mt-1 text-xl font-black" style={{ color: String(color) }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <section aria-label="Personal game dashboard" className="mb-6 grid gap-3 sm:grid-cols-3">
          {state.lastPlayed ? (
            <Link href={state.lastPlayed.href} className="rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent)]/10 p-4 transition hover:border-[var(--accent)]">
              <span className="text-[0.66rem] font-black uppercase tracking-wider text-[var(--accent)]">Continue</span>
              <span className="mt-2 block truncate font-extrabold">{state.lastPlayed.emoji} {state.lastPlayed.label}</span>
              <span className="mt-1 block text-xs text-[var(--text-faint)]">{formatRelativeTime(state.lastPlayed.visitedAt)} →</span>
            </Link>
          ) : (
            <button type="button" onClick={surprise} className="rounded-2xl border border-dashed border-[var(--border-strong)] p-4 text-left hover:bg-[var(--bg-elev)]"><span className="text-[0.66rem] font-black uppercase tracking-wider text-[var(--text-faint)]">First pick</span><span className="mt-2 block font-extrabold">Let us choose a game</span><span className="mt-1 block text-xs text-[var(--text-faint)]">Preview a random match →</span></button>
          )}
          <button type="button" onClick={() => recommended && setSelectedGame(recommended)} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev)]">
            <span className="text-[0.66rem] font-black uppercase tracking-wider text-[var(--info)]">Recommended</span>
            <span className="mt-2 block truncate font-extrabold">{recommended?.emoji} {recommended?.title ?? "Explore the library"}</span>
            <span className="mt-1 block text-xs text-[var(--text-faint)]">Based on saves and activity →</span>
          </button>
          <button type="button" onClick={surprise} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5">
            <span className="text-[0.66rem] font-black uppercase tracking-wider text-[var(--accent)]">Surprise me</span>
            <span className="mt-2 block font-extrabold">Choose from {visibleGames.length || games.length} matches</span>
            <span className="mt-1 block text-xs text-[var(--text-faint)]">Respects the active filters →</span>
          </button>
        </section>

        <section aria-label="Filter games" className="panel mb-8 p-3 sm:p-4">
          <div className="relative">
            <label htmlFor="game-search" className="sr-only">Search games</label>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"><SearchIcon /></span>
            <input
              ref={searchRef}
              id="game-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") addSearch(query); }}
              onBlur={() => addSearch(query)}
              placeholder="Search names, descriptions, modes or pace…"
              className="input !h-12 !rounded-xl !pl-11 !pr-24 !font-sans !text-base"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {!query && <kbd className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[0.62rem] font-bold text-[var(--text-faint)]">/</kbd>}
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev-2)]">Clear</button>}
            </div>
          </div>

          {state.searchHistory.length > 0 && (
            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-[0.65rem] font-black uppercase tracking-wider text-[var(--text-faint)]">Recent</span>
              {state.searchHistory.map((item) => <button key={item} type="button" onClick={() => setQuery(item)} className="chip shrink-0 !py-1 text-xs">{item}</button>)}
              <button type="button" onClick={clearSearchHistory} className="shrink-0 text-xs font-bold text-[var(--text-faint)] hover:text-[var(--danger)]">Clear</button>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="group" aria-label="Game categories">
              {FILTERS.map((filter) => (
                <button key={filter.id} type="button" onClick={() => setActiveFilter(filter.id)} aria-pressed={activeFilter === filter.id} className={`btn shrink-0 !rounded-full !px-4 !py-2 text-sm ${activeFilter === filter.id ? "btn-primary" : "btn-ghost"}`}>{filter.label}</button>
              ))}
            </div>
            <button type="button" onClick={() => setAdvancedFiltersOpen((value) => !value)} aria-expanded={advancedFiltersOpen} className={`btn shrink-0 !py-2 text-sm ${advancedFiltersOpen || advancedFilterCount ? "btn-good" : "btn-ghost"}`}>
              Filters{advancedFilterCount > 0 ? ` · ${advancedFilterCount}` : ""} <span aria-hidden="true">{advancedFiltersOpen ? "−" : "+"}</span>
            </button>
          </div>

          {advancedFiltersOpen && (
            <div className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1 text-[0.66rem] font-black uppercase tracking-wider text-[var(--text-faint)]">Mode<select value={modeFilter} onChange={(event) => setModeFilter(event.target.value as ModeFilter)} className="input !h-10 !font-sans !text-sm normal-case tracking-normal text-[var(--text)]"><option value="all">Any mode</option><option value="online">Online</option><option value="bot">Vs bot</option><option value="local">Pass & play</option><option value="solo">Solo</option></select></label>
              <label className="grid gap-1 text-[0.66rem] font-black uppercase tracking-wider text-[var(--text-faint)]">Pace<select value={paceFilter} onChange={(event) => setPaceFilter(event.target.value as PaceFilter)} className="input !h-10 !font-sans !text-sm normal-case tracking-normal text-[var(--text)]"><option value="all">Any pace</option><option value="quick">Quick</option><option value="medium">Medium</option><option value="deep">Deep</option></select></label>
              <label className="grid gap-1 text-[0.66rem] font-black uppercase tracking-wider text-[var(--text-faint)]">Sort<select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="input !h-10 !font-sans !text-sm normal-case tracking-normal text-[var(--text)]"><option value="recommended">Recommended</option><option value="favorites">Favorites first</option><option value="most-played">Most played</option><option value="recent">Recently played</option><option value="az">A–Z</option></select></label>
              <button type="button" onClick={() => setFavoritesOnly((value) => !value)} aria-pressed={favoritesOnly} className={`btn self-end !h-10 ${favoritesOnly ? "btn-good" : "btn-ghost"}`}><HeartIcon filled={favoritesOnly} /> Favorites only</button>
            </div>
          )}
        </section>

        <div className="mb-6 flex items-center justify-between gap-4">
          <p aria-live="polite" className="text-sm font-semibold text-[var(--text-muted)]">Showing <span className="text-[var(--text)]">{visibleGames.length}</span> {visibleGames.length === 1 ? "game" : "games"}</p>
          {hasActiveFilters && <button type="button" onClick={resetFilters} className="text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-strong)]">Reset everything</button>}
        </div>

        {visibleSections.length > 0 ? visibleSections.map((section) => (
          <section key={section.id} className="mb-10 scroll-mt-24">
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div><h2 className="text-2xl font-black tracking-tight">{section.title}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{section.description}</p></div>
              <span className="chip shrink-0">{section.games.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.games.map((game) => {
                const href = game.links[0]?.href;
                return <GameCardView key={game.title} game={game} favorite={Boolean(state.favorites[href])} compared={compareHrefs.includes(href)} compareFull={compareHrefs.length >= 3} playCount={state.playCounts[href] ?? 0} onFavorite={() => toggleFavorite(game)} onQuickView={() => setSelectedGame(game)} onCompare={() => toggleCompare(href)} />;
              })}
            </div>
          </section>
        )) : (
          <div className="panel flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 text-4xl" aria-hidden="true">♟</span>
            <h2 className="text-xl font-extrabold">No games found</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">Try another name, mode or pace—or reset the discovery controls.</p>
            <button type="button" onClick={resetFilters} className="btn btn-primary mt-5">Show every game</button>
          </div>
        )}
      </div>

      {selectedGame && <GameQuickView game={selectedGame} onClose={() => setSelectedGame(null)} />}

      {compareGames.length > 0 && (
        <aside aria-label="Game comparison" className="fixed bottom-3 left-3 right-3 z-[70] rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] p-3 shadow-2xl md:left-[232px]">
          <div className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto">
            <div className="shrink-0 px-2"><p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">Compare</p><p className="text-[0.65rem] text-[var(--text-faint)]">{compareGames.length}/3 selected</p></div>
            {compareGames.map((game) => (
              <div key={game.title} className="flex min-w-44 items-center rounded-xl border border-[var(--border)] hover:bg-[var(--bg-elev)]">
                <button type="button" onClick={() => setSelectedGame(game)} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left">
                  <span>{game.emoji}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{game.title}</span><span className="block text-[0.62rem] text-[var(--text-faint)]">{game.pace} · {game.links.length} modes</span></span>
                </button>
                <button type="button" onClick={() => toggleCompare(game.links[0]?.href)} className="mr-2 rounded p-1 text-[var(--text-faint)] hover:text-[var(--danger)]" aria-label={`Remove ${game.title}`}>×</button>
              </div>
            ))}
            <button type="button" onClick={() => setCompareHrefs([])} className="btn btn-ghost ml-auto shrink-0 !py-2 text-xs">Clear all</button>
          </div>
        </aside>
      )}
    </div>
  );
}
