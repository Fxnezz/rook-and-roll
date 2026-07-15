"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { formatRelativeTime, useQol, type QolCenterView, type QolGame } from "@/lib/qol/useQol";
import { QOL_STATIC_ROUTES } from "@/lib/qol/routes";
import { WebsiteEnhancementLayer } from "@/components/qol/WebsiteEnhancements";
import { WebsiteIntelligenceLayer } from "@/components/qol/WebsiteIntelligence";
import { openSettingsPanel } from "@/lib/settings/openSettings";

type CommandResult = {
  href: string;
  label: string;
  detail: string;
  emoji: string;
  kind: "Page" | "Game" | "Recent" | "Pinned";
};

const CENTER_TABS: Array<{ id: QolCenterView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "collections", label: "Collections" },
  { id: "focus", label: "Focus" },
];

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function CommandPalette() {
  const { state, paletteOpen, closePalette, addSearch } = useQol();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<CommandResult[]>(() => {
    const pages: CommandResult[] = QOL_STATIC_ROUTES.map((route) => ({
      href: route.href,
      label: route.label,
      detail: route.description,
      emoji: route.emoji,
      kind: "Page",
    }));
    const games: CommandResult[] = state.registry.flatMap((game) =>
      game.links.map((link) => ({
        href: link.href,
        label: link.label === "Play" ? game.title : `${game.title} · ${link.label}`,
        detail: game.blurb,
        emoji: game.emoji,
        kind: "Game" as const,
      })),
    );
    const pinned: CommandResult[] = state.pins.map((route) => ({
      href: route.href,
      label: route.label,
      detail: "Pinned shortcut",
      emoji: route.emoji ?? "★",
      kind: "Pinned",
    }));
    const recent: CommandResult[] = state.recent.slice(0, 6).map((route) => ({
      href: route.href,
      label: route.label,
      detail: `Visited ${formatRelativeTime(route.visitedAt)}`,
      emoji: route.emoji ?? "↻",
      kind: "Recent",
    }));
    const byHref = new Map<string, CommandResult>();
    [...pinned, ...recent, ...pages, ...games].forEach((item) => {
      if (!byHref.has(item.href)) byHref.set(item.href, item);
    });
    const normalized = query.trim().toLowerCase();
    const all = [...byHref.values()];
    if (!normalized) return all.slice(0, 14);
    return all
      .map((item) => ({
        item,
        score:
          item.label.toLowerCase().startsWith(normalized) ? 4
            : item.label.toLowerCase().includes(normalized) ? 3
              : item.detail.toLowerCase().includes(normalized) ? 2
                : item.kind.toLowerCase().includes(normalized) ? 1
                  : 0,
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
      .map(({ item }) => item)
      .slice(0, 18);
  }, [query, state.pins, state.recent, state.registry]);

  useEffect(() => {
    if (!paletteOpen) return;
    const frame = requestAnimationFrame(() => {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [paletteOpen]);

  useEffect(() => {
    if (!paletteOpen) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prior;
    };
  }, [paletteOpen]);

  const choose = (result: CommandResult | undefined) => {
    if (!result) return;
    addSearch(query);
    closePalette();
    router.push(result.href);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === "Escape") {
      closePalette();
    }
  };

  if (!paletteOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/65 px-3 pt-[10vh] backdrop-blur-sm" onMouseDown={closePalette}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
          <span className="text-[var(--accent)]"><SearchIcon size={21} /></span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="h-16 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-[var(--text-faint)]"
            placeholder="Search games, pages, modes and tools…"
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex] ? `command-${activeIndex}` : undefined}
          />
          <kbd className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[0.65rem] font-bold text-[var(--text-faint)]">ESC</kbd>
        </div>
        <div id="command-results" role="listbox" className="max-h-[58vh] overflow-y-auto p-2">
          {results.length ? results.map((result, index) => (
            <button
              id={`command-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              key={`${result.kind}-${result.href}`}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(result)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${index === activeIndex ? "bg-[var(--bg-elev-2)]" : "hover:bg-[var(--bg-elev)]"}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg)] text-lg">{result.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold">{result.label}</span>
                <span className="block truncate text-xs text-[var(--text-faint)]">{result.detail}</span>
              </span>
              <span className="chip !px-2 !py-1 !text-[0.62rem]">{result.kind}</span>
            </button>
          )) : (
            <div className="grid min-h-40 place-items-center px-5 text-center">
              <div>
                <p className="font-extrabold">No matching command</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Try a game title, play mode, or destination.</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg)]/40 px-4 py-2 text-[0.68rem] font-semibold text-[var(--text-faint)]">
          <span>↑↓ move · Enter open</span>
          <span>{results.length} results</span>
        </div>
      </section>
    </div>
  );
}

function GoalCard() {
  const { state, setDailyTarget } = useQol();
  const goal = state.dailyGoal;
  const percent = Math.min(100, Math.round((goal.progress / goal.target) * 100));
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">Daily play goal</p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">{goal.progress} of {goal.target} sessions · {goal.streak} day streak</p>
        </div>
        <span className="text-lg font-black text-[var(--accent)]">{percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex gap-2" aria-label="Daily target">
        {([1, 3, 5] as const).map((target) => (
          <button key={target} type="button" onClick={() => setDailyTarget(target)} className={`btn flex-1 !py-1.5 !text-xs ${goal.target === target ? "btn-primary" : "btn-ghost"}`}>
            {target} {target === 1 ? "play" : "plays"}
          </button>
        ))}
      </div>
    </section>
  );
}

function FocusCard() {
  const { state, startFocus, pauseFocus, resumeFocus, stopFocus, setInterfaceFocus } = useQol();
  const [now, setNow] = useState<number | null>(null);
  const focus = state.focus;

  useEffect(() => {
    if (!focus.endsAt) return;
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [focus.endsAt]);

  const remaining = focus.endsAt && now !== null
    ? Math.max(0, Math.ceil((focus.endsAt - now) / 1000))
    : focus.remainingSeconds;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const running = Boolean(focus.endsAt && remaining > 0);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-faint)]">Focus session</p>
        <p className="mt-3 font-mono text-5xl font-black tracking-tight text-[var(--accent)]">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {([15, 25, 45] as const).map((duration) => (
            <button key={duration} type="button" onClick={() => startFocus(duration)} className={`btn !py-2 text-xs ${focus.durationMinutes === duration ? "btn-primary" : "btn-ghost"}`}>{duration} min</button>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {running ? (
            <button type="button" className="btn" onClick={pauseFocus}>Pause</button>
          ) : remaining < focus.durationMinutes * 60 && remaining > 0 ? (
            <button type="button" className="btn btn-primary" onClick={resumeFocus}>Resume</button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={stopFocus}>Reset</button>
        </div>
      </section>
      <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] p-4">
        <span>
          <span className="block text-sm font-extrabold">Calm the interface</span>
          <span className="block text-xs text-[var(--text-faint)]">De-emphasize navigation while the session runs.</span>
        </span>
        <input type="checkbox" checked={focus.interfaceFocus} onChange={(event) => setInterfaceFocus(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
      </label>
    </div>
  );
}

function QualityCenter() {
  const {
    state,
    online,
    centerOpen,
    centerView,
    closeCenter,
    openCenter,
    clearRecent,
    pinRoute,
    isPinned,
    toggleFavorite,
    createCollection,
    deleteCollection,
    toggleCollectionGame,
    dismissOnboarding,
    onboardingProgress,
  } = useQol();
  const pathname = usePathname();
  const [collectionName, setCollectionName] = useState("");
  const currentGame = state.registry.find((game) => game.links.some((link) => link.href === pathname));
  const currentLabel = currentGame?.title ?? QOL_STATIC_ROUTES.find((route) => route.href === pathname)?.label ?? pathname;

  return (
    <SlideOver open={centerOpen} onClose={closeCenter} title="Player Tools">
      <div className="border-b border-[var(--border)] p-3">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Player tool sections">
          {CENTER_TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={centerView === tab.id} onClick={() => openCenter(tab.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${centerView === tab.id ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-elev)]"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-4 qol-density-surface">
        <section className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-xs">
          <span className="font-bold">Current page · <span className="text-[var(--accent)]">{currentLabel}</span></span>
          <span className={`flex items-center gap-1.5 font-bold ${online ? "text-[var(--good)]" : "text-[var(--danger)]"}`}>
            <span className="h-2 w-2 rounded-full bg-current" /> {online ? "Online" : "Offline"}
          </span>
        </section>

        {centerView === "overview" && (
          <>
            {state.lastPlayed && (
              <Link href={state.lastPlayed.href} onClick={closeCenter} className="group block rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 transition hover:border-[var(--accent)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Continue playing</span>
                <span className="mt-2 flex items-center justify-between gap-3">
                  <span className="font-extrabold">{state.lastPlayed.emoji} {state.lastPlayed.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">{formatRelativeTime(state.lastPlayed.visitedAt)} →</span>
                </span>
              </Link>
            )}
            <GoalCard />
            {!state.onboardingDismissed && (
              <section className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold">Power-user setup</p>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">{onboardingProgress}% complete</p>
                  </div>
                  <button type="button" className="text-xs font-bold text-[var(--text-faint)] hover:text-[var(--text)]" onClick={() => dismissOnboarding(true)}>Dismiss</button>
                </div>
                <div className="mt-3 grid gap-2 text-xs">
                  {[
                    [state.recent.some((item) => item.href === "/play"), "Visit the Games Hub"],
                    [Object.keys(state.favorites).length > 0, "Favorite a game"],
                    [state.commandUses > 0, "Open the command palette"],
                    [state.focusUses > 0, "Start a focus session"],
                  ].map(([done, label]) => (
                    <div key={String(label)} className="flex items-center gap-2">
                      <span className={`grid h-5 w-5 place-items-center rounded-full text-[0.65rem] font-black ${done ? "bg-[var(--good)] text-white" : "bg-[var(--bg-elev-2)] text-[var(--text-faint)]"}`}>{done ? "✓" : "·"}</span>
                      <span className={done ? "text-[var(--text-faint)] line-through" : "font-semibold"}>{String(label)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section className="grid grid-cols-2 gap-2">
              <button type="button" className="btn !justify-start !py-3 text-xs" onClick={() => pinRoute({ href: pathname, label: currentLabel, emoji: currentGame?.emoji, kind: currentGame ? "game" : "route" })}>{isPinned(pathname) ? "★ Unpin page" : "☆ Pin page"}</button>
              <button type="button" className="btn !justify-start !py-3 text-xs" onClick={() => navigator.clipboard.writeText(window.location.href)}>⧉ Copy link</button>
              {currentGame && <button type="button" className="btn !justify-start !py-3 text-xs" onClick={() => toggleFavorite(currentGame)}>{state.favorites[currentGame.links[0]?.href] ? "♥ Unfavorite" : "♡ Favorite game"}</button>}
              <button type="button" className="btn !justify-start !py-3 text-xs" onClick={() => { closeCenter(); openSettingsPanel("qol"); }}>◇ QOL settings</button>
              <Link href="/quality-of-life" onClick={closeCenter} className="btn !justify-start !py-3 text-xs">✦ Patch Notes</Link>
            </section>
          </>
        )}

        {centerView === "activity" && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold">Recent activity</h2>
                <p className="text-xs text-[var(--text-faint)]">Stored only on this device.</p>
              </div>
              <button type="button" onClick={clearRecent} className="text-xs font-bold text-[var(--danger)]">Clear</button>
            </div>
            <div className="space-y-2">
              {state.recent.length ? state.recent.map((item) => (
                <Link key={`${item.href}-${item.visitedAt}`} href={item.href} onClick={closeCenter} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--bg-elev)]">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--bg-elev-2)]">{item.emoji ?? (item.kind === "game" ? "◈" : "↻")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{item.label}</span>
                    <span className="block text-xs text-[var(--text-faint)]">{item.kind === "game" ? "Game" : "Page"} · {formatRelativeTime(item.visitedAt)}</span>
                  </span>
                </Link>
              )) : <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-faint)]">Your recent activity will appear here.</p>}
            </div>
          </section>
        )}

        {centerView === "collections" && (
          <section>
            <h2 className="font-extrabold">Game collections</h2>
            <p className="mt-1 text-xs text-[var(--text-faint)]">Create a shelf, then add games from their quick-view dialog.</p>
            <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); createCollection(collectionName); setCollectionName(""); }}>
              <input className="input min-w-0 flex-1" value={collectionName} maxLength={36} onChange={(event) => setCollectionName(event.target.value)} placeholder="Party night…" aria-label="Collection name" />
              <button className="btn btn-primary" disabled={!collectionName.trim()}>Create</button>
            </form>
            <div className="mt-4 space-y-3">
              {state.collections.map((collection) => (
                <article key={collection.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold">{collection.name}</h3>
                      <p className="text-xs text-[var(--text-faint)]">{collection.gameHrefs.length} games</p>
                    </div>
                    <button type="button" onClick={() => deleteCollection(collection.id)} className="text-xs font-bold text-[var(--danger)]">Delete</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {collection.gameHrefs.map((href) => {
                      const game = state.registry.find((item) => item.links[0]?.href === href);
                      return game ? (
                        <span key={href} className="chip gap-1.5">
                          {game.emoji} {game.title}
                          <button type="button" onClick={() => toggleCollectionGame(collection.id, href)} aria-label={`Remove ${game.title}`}>×</button>
                        </span>
                      ) : null;
                    })}
                    {!collection.gameHrefs.length && <span className="text-xs text-[var(--text-faint)]">No games saved yet.</span>}
                  </div>
                </article>
              ))}
              {!state.collections.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-7 text-center text-sm text-[var(--text-faint)]">Your first custom shelf starts here.</p>}
            </div>
          </section>
        )}

        {centerView === "focus" && <FocusCard />}
      </div>
    </SlideOver>
  );
}

function GlobalShortcuts() {
  const { state, openPalette, paletteOpen, centerOpen, closePalette, closeCenter } = useQol();
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
        return;
      }
      if (event.key === "Escape") {
        if (paletteOpen) closePalette();
        else if (centerOpen) closeCenter();
        return;
      }
      if (!state.shortcutsEnabled || typing) return;
      if (event.key === "?") {
        event.preventDefault();
        openSettingsPanel("qol");
        return;
      }
      if (!event.altKey) return;
      const destinations: Record<string, string> = { h: "/", g: "/play", o: "/play/online", b: "/play/bot", t: "/training" };
      const key = event.key.toLowerCase();
      if (key === "q") {
        event.preventDefault();
        openSettingsPanel("qol");
      } else if (destinations[key]) {
        event.preventDefault();
        router.push(destinations[key]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [centerOpen, closeCenter, closePalette, openPalette, paletteOpen, router, state.shortcutsEnabled]);

  return null;
}

function ConnectionBanner() {
  const { online } = useQol();
  if (online) return null;
  return (
    <div role="status" className="fixed bottom-3 left-3 right-3 z-[105] flex items-center justify-between gap-3 rounded-xl border border-[var(--danger)]/40 bg-[var(--panel)] px-4 py-3 shadow-2xl md:left-[248px]">
      <div>
        <p className="text-sm font-extrabold">You&apos;re offline</p>
        <p className="text-xs text-[var(--text-faint)]">Local preferences still work. Online games will reconnect when the network returns.</p>
      </div>
      <button type="button" className="btn btn-danger shrink-0 !py-2 text-xs" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}

export function QolGlobalLayer() {
  return (
    <>
      <GlobalShortcuts />
      <CommandPalette />
      <QualityCenter />
      <ConnectionBanner />
      <WebsiteEnhancementLayer />
      <WebsiteIntelligenceLayer />
    </>
  );
}

export function useCurrentGame(): QolGame | undefined {
  const { state } = useQol();
  const pathname = usePathname();
  return state.registry.find((game) => game.links.some((link) => link.href === pathname));
}
