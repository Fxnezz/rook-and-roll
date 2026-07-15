"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { GameCard } from "@/app/play/page";
import { IconSearch, IconShuffle, IconGrid, IconList, IconStar, IconHistory } from "@/components/ui/icons";

const FAVORITES_KEY = "rr.hub.favorites.v1";
const RECENT_KEY = "rr.hub.recent.v1";
const VIEW_KEY = "rr.hub.view.v1";
const MAX_RECENT = 8;

interface Category {
  id: string;
  label: string;
  games: GameCard[];
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function GameTile({
  game,
  isNew,
  isFavorite,
  onToggleFavorite,
  onOpen,
  compact,
}: {
  game: GameCard;
  isNew: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  compact: boolean;
}) {
  if (compact) {
    return (
      <div className="panel flex items-center gap-3 p-2.5">
        <span className="text-xl">{game.emoji}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{game.title}</span>
        {isNew && <span className="chip !px-1.5 !py-0.5 text-[9px] uppercase">New</span>}
        <button
          onClick={onToggleFavorite}
          className="shrink-0 p-1 text-[var(--text-faint)] transition-colors hover:text-[var(--accent)]"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <IconStar width={15} height={15} fill={isFavorite ? "var(--accent)" : "none"} stroke={isFavorite ? "var(--accent)" : "currentColor"} />
        </button>
        <Link href={game.links[0].href} onClick={onOpen} className="btn btn-primary !px-3 !py-1.5 text-xs shrink-0">
          {game.links[0].label}
        </Link>
      </div>
    );
  }

  return (
    <div className="panel relative flex flex-col gap-2 p-4">
      {isNew && (
        <span className="absolute -top-2 left-3 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--accent-contrast)]">
          New
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{game.emoji}</span>
        <h3 className="flex-1 font-bold">{game.title}</h3>
        <button
          onClick={onToggleFavorite}
          className="shrink-0 p-1 text-[var(--text-faint)] transition-colors hover:text-[var(--accent)]"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <IconStar width={17} height={17} fill={isFavorite ? "var(--accent)" : "none"} stroke={isFavorite ? "var(--accent)" : "currentColor"} />
        </button>
      </div>
      <p className="flex-1 text-sm text-[var(--text-muted)]">{game.blurb}</p>
      <div className="flex flex-wrap gap-2">
        {game.links.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onOpen}
            className={`btn flex-1 !py-2 text-sm ${i === 0 ? "btn-primary" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GamesHubClient({ categories, newTitles }: { categories: Category[]; newTitles: string[] }) {
  const allGames = useMemo(() => categories.flatMap((c) => c.games), [categories]);
  const newSet = useMemo(() => new Set(newTitles), [newTitles]);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sort, setSort] = useState<"default" | "az">("default");
  const [compact, setCompact] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFavorites(loadSet(FAVORITES_KEY));
    setRecent(loadRecent());
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "compact") setCompact(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleFavorite = (title: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const recordRecent = (title: string) => {
    setRecent((prev) => {
      const next = [title, ...prev.filter((t) => t !== title)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const setCompactMode = (v: boolean) => {
    setCompact(v);
    try {
      localStorage.setItem(VIEW_KEY, v ? "compact" : "grid");
    } catch {
      /* ignore */
    }
  };

  const q = query.trim().toLowerCase();
  const matches = (g: GameCard) => !q || g.title.toLowerCase().includes(q) || g.blurb.toLowerCase().includes(q);

  const sortGames = (games: GameCard[]) => (sort === "az" ? [...games].sort((a, b) => a.title.localeCompare(b.title)) : games);

  const visibleCategories = categories
    .filter((c) => activeCategory === "all" || activeCategory === c.id)
    .map((c) => ({ ...c, games: sortGames(c.games.filter(matches)) }))
    .filter((c) => c.games.length > 0);

  const favoriteGames = allGames.filter((g) => favorites.has(g.title) && matches(g));
  const recentGames = recent
    .map((t) => allGames.find((g) => g.title === t))
    .filter((g): g is GameCard => g != null && matches(g));

  const surpriseMe = () => {
    const pool = allGames.filter((g) => !q || matches(g));
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    recordRecent(pick.title);
    window.location.href = pick.links[0].href;
  };

  const tileGrid = compact ? "grid gap-2 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games… (press /)"
            className="input !pl-9"
            aria-label="Search games"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={surpriseMe} className="btn !text-sm" title="Play a random game">
            <IconShuffle width={16} height={16} /> Surprise me
          </button>
          <select className="input !w-auto !py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as "default" | "az")} aria-label="Sort games">
            <option value="default">Default order</option>
            <option value="az">A–Z</option>
          </select>
          <button
            onClick={() => setCompactMode(!compact)}
            className="btn !p-2"
            aria-label={compact ? "Switch to grid view" : "Switch to compact view"}
            title={compact ? "Grid view" : "Compact view"}
          >
            {compact ? <IconGrid width={16} height={16} /> : <IconList width={16} height={16} />}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory("all")}
          className={`chip !cursor-pointer transition-colors ${activeCategory === "all" ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
        >
          All ({allGames.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`chip !cursor-pointer transition-colors ${activeCategory === c.id ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
          >
            {c.label} ({c.games.length})
          </button>
        ))}
      </div>

      {activeCategory === "all" && favoriteGames.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[var(--text-faint)]">
            <IconStar width={14} height={14} fill="var(--accent)" stroke="var(--accent)" /> Favorites
          </h2>
          <div className={tileGrid}>
            {favoriteGames.map((g) => (
              <GameTile
                key={g.title}
                game={g}
                compact={compact}
                isNew={newSet.has(g.title)}
                isFavorite={favorites.has(g.title)}
                onToggleFavorite={() => toggleFavorite(g.title)}
                onOpen={() => recordRecent(g.title)}
              />
            ))}
          </div>
        </section>
      )}

      {activeCategory === "all" && recentGames.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[var(--text-faint)]">
            <IconHistory width={14} height={14} /> Recently played
          </h2>
          <div className={tileGrid}>
            {recentGames.map((g) => (
              <GameTile
                key={g.title}
                game={g}
                compact={compact}
                isNew={newSet.has(g.title)}
                isFavorite={favorites.has(g.title)}
                onToggleFavorite={() => toggleFavorite(g.title)}
                onOpen={() => recordRecent(g.title)}
              />
            ))}
          </div>
        </section>
      )}

      {visibleCategories.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">No games match &quot;{query}&quot;.</p>
      ) : (
        visibleCategories.map((c) => (
          <section key={c.id} className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-faint)]">{c.label}</h2>
            <div className={tileGrid}>
              {c.games.map((g) => (
                <GameTile
                  key={g.title}
                  game={g}
                  compact={compact}
                  isNew={newSet.has(g.title)}
                  isFavorite={favorites.has(g.title)}
                  onToggleFavorite={() => toggleFavorite(g.title)}
                  onOpen={() => recordRecent(g.title)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
