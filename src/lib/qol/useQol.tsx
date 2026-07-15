"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type QolDensity = "compact" | "comfortable" | "spacious";
export type QolCenterView = "overview" | "activity" | "collections" | "focus";
export type WebsiteContentWidth = "narrow" | "standard" | "wide";
export type WebsiteLineHeight = "compact" | "comfortable" | "relaxed";
export type WebsiteLetterSpacing = "normal" | "wide";
export type WebsiteBreakReminder = 0 | 25 | 45 | 60;
export type WebsiteTextScale = 90 | 100 | 110 | 120;

export interface WebsitePreferences {
  navigationProgress: boolean;
  restoreScroll: boolean;
  backToTop: boolean;
  breadcrumbs: boolean;
  pageTools: boolean;
  pageNotes: boolean;
  readingRuler: boolean;
  focusSpotlight: boolean;
  underlineLinks: boolean;
  largeTargets: boolean;
  solidSurfaces: boolean;
  grayscale: boolean;
  contentWidth: WebsiteContentWidth;
  lineHeight: WebsiteLineHeight;
  letterSpacing: WebsiteLetterSpacing;
  calmVisuals: boolean;
  sessionClock: boolean;
  breakReminder: WebsiteBreakReminder;
  lowDataMode: boolean;
  autoDataSaver: boolean;
  batterySaver: boolean;
  routeAnnouncements: boolean;
  mobileDock: boolean;
  pageGuide: boolean;
  pageOutline: boolean;
  readingInsights: boolean;
  sectionDeepLinks: boolean;
  shareToolkit: boolean;
  smartBack: boolean;
  routeRefresh: boolean;
  pageHealthAudit: boolean;
  textScale: WebsiteTextScale;
  contrastBoost: boolean;
  readableFont: boolean;
  largeCursor: boolean;
  dimDecorativeImages: boolean;
  externalLinkClarity: boolean;
  externalLinksNewTab: boolean;
  restoreMainFocus: boolean;
  keyboardGuide: boolean;
  touchFeedback: boolean;
  haptics: boolean;
  safeAreaLayout: boolean;
  formDraftRecovery: boolean;
  unsavedWorkGuard: boolean;
  idlePowerPause: boolean;
  cleanPrint: boolean;
}

export const DEFAULT_WEBSITE_PREFERENCES: WebsitePreferences = {
  navigationProgress: true,
  restoreScroll: true,
  backToTop: true,
  breadcrumbs: false,
  pageTools: true,
  pageNotes: true,
  readingRuler: false,
  focusSpotlight: false,
  underlineLinks: false,
  largeTargets: false,
  solidSurfaces: false,
  grayscale: false,
  contentWidth: "standard",
  lineHeight: "comfortable",
  letterSpacing: "normal",
  calmVisuals: false,
  sessionClock: false,
  breakReminder: 0,
  lowDataMode: false,
  autoDataSaver: true,
  batterySaver: true,
  routeAnnouncements: true,
  mobileDock: true,
  pageGuide: true,
  pageOutline: true,
  readingInsights: true,
  sectionDeepLinks: true,
  shareToolkit: true,
  smartBack: true,
  routeRefresh: true,
  pageHealthAudit: true,
  textScale: 100,
  contrastBoost: false,
  readableFont: false,
  largeCursor: false,
  dimDecorativeImages: false,
  externalLinkClarity: true,
  externalLinksNewTab: false,
  restoreMainFocus: true,
  keyboardGuide: true,
  touchFeedback: true,
  haptics: false,
  safeAreaLayout: true,
  formDraftRecovery: true,
  unsavedWorkGuard: true,
  idlePowerPause: true,
  cleanPrint: true,
};

export interface QolGameLink {
  href: string;
  label: string;
}

export interface QolGame {
  title: string;
  blurb: string;
  emoji: string;
  category: "chess" | "board" | "arcade" | "original";
  pace: "quick" | "medium" | "deep";
  links: QolGameLink[];
}

export interface QolRoute {
  href: string;
  label: string;
  visitedAt: number;
  kind: "route" | "game";
  emoji?: string;
}

export interface QolCollection {
  id: string;
  name: string;
  gameHrefs: string[];
  createdAt: number;
}

interface DailyGoal {
  date: string;
  target: 1 | 3 | 5;
  progress: number;
  streak: number;
  lastCompletedDate: string | null;
}

interface FocusState {
  durationMinutes: 15 | 25 | 45;
  endsAt: number | null;
  remainingSeconds: number;
  interfaceFocus: boolean;
  completed: number;
}

export interface QolPersistedState {
  favorites: Record<string, QolGame>;
  pins: QolRoute[];
  recent: QolRoute[];
  registry: QolGame[];
  playCounts: Record<string, number>;
  lastPlayed: QolRoute | null;
  collections: QolCollection[];
  searchHistory: string[];
  dailyGoal: DailyGoal;
  focus: FocusState;
  density: QolDensity;
  hiddenNav: string[];
  shortcutsEnabled: boolean;
  onboardingDismissed: boolean;
  commandUses: number;
  focusUses: number;
  lastSurpriseHref: string | null;
  website: WebsitePreferences;
  pageNotes: Record<string, string>;
}

interface QolContextValue {
  state: QolPersistedState;
  ready: boolean;
  online: boolean;
  paletteOpen: boolean;
  centerOpen: boolean;
  centerView: QolCenterView;
  registerGames: (games: QolGame[]) => void;
  toggleFavorite: (game: QolGame) => void;
  isFavorite: (href: string) => boolean;
  pinRoute: (route: Pick<QolRoute, "href" | "label"> & Partial<Pick<QolRoute, "emoji" | "kind">>) => void;
  isPinned: (href: string) => boolean;
  clearRecent: () => void;
  addSearch: (query: string) => void;
  clearSearchHistory: () => void;
  createCollection: (name: string) => void;
  deleteCollection: (id: string) => void;
  toggleCollectionGame: (collectionId: string, href: string) => void;
  setDailyTarget: (target: 1 | 3 | 5) => void;
  startFocus: (minutes: 15 | 25 | 45) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => void;
  setInterfaceFocus: (enabled: boolean) => void;
  setDensity: (density: QolDensity) => void;
  setNavHidden: (href: string, hidden: boolean) => void;
  restoreNavigation: () => void;
  setShortcutsEnabled: (enabled: boolean) => void;
  dismissOnboarding: (dismissed: boolean) => void;
  onboardingProgress: number;
  openPalette: () => void;
  closePalette: () => void;
  openCenter: (view?: QolCenterView) => void;
  closeCenter: () => void;
  setLastSurprise: (href: string) => void;
  updateWebsite: (patch: Partial<WebsitePreferences>) => void;
  setPageNote: (pathname: string, note: string) => void;
  clearPageNote: (pathname: string) => void;
  resetWebsitePreferences: () => void;
  importState: (value: unknown) => boolean;
  resetState: () => void;
}

const STORAGE_KEY = "rr.qol.v1";
const MAX_RECENT = 18;

function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function yesterdayOf(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return localDate(value);
}

function defaultState(): QolPersistedState {
  return {
    favorites: {},
    pins: [],
    recent: [],
    registry: [],
    playCounts: {},
    lastPlayed: null,
    collections: [],
    searchHistory: [],
    dailyGoal: {
      date: localDate(),
      target: 3,
      progress: 0,
      streak: 0,
      lastCompletedDate: null,
    },
    focus: {
      durationMinutes: 25,
      endsAt: null,
      remainingSeconds: 25 * 60,
      interfaceFocus: false,
      completed: 0,
    },
    density: "comfortable",
    hiddenNav: [],
    shortcutsEnabled: true,
    onboardingDismissed: false,
    commandUses: 0,
    focusUses: 0,
    lastSurpriseHref: null,
    website: { ...DEFAULT_WEBSITE_PREFERENCES },
    pageNotes: {},
  };
}

function routeLabel(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname === "/play") return "Games Hub";
  return pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))
    .join(" · ");
}

function normalizeState(value: unknown): QolPersistedState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Partial<QolPersistedState>;
  if (!("favorites" in source) && !("collections" in source) && !("dailyGoal" in source)) return null;
  const base = defaultState();
  const density = source.density;

  return {
    ...base,
    ...source,
    favorites: source.favorites && typeof source.favorites === "object" ? source.favorites : {},
    pins: Array.isArray(source.pins) ? source.pins.slice(0, 12) : [],
    recent: Array.isArray(source.recent) ? source.recent.slice(0, MAX_RECENT) : [],
    registry: Array.isArray(source.registry) ? source.registry : [],
    playCounts: source.playCounts && typeof source.playCounts === "object" ? source.playCounts : {},
    collections: Array.isArray(source.collections) ? source.collections : [],
    searchHistory: Array.isArray(source.searchHistory) ? source.searchHistory.slice(0, 8) : [],
    dailyGoal: { ...base.dailyGoal, ...(source.dailyGoal ?? {}) },
    focus: { ...base.focus, ...(source.focus ?? {}) },
    website: { ...base.website, ...(source.website ?? {}) },
    pageNotes: source.pageNotes && typeof source.pageNotes === "object" ? source.pageNotes : {},
    density: density === "compact" || density === "spacious" ? density : "comfortable",
    hiddenNav: Array.isArray(source.hiddenNav) ? source.hiddenNav : [],
    shortcutsEnabled: typeof source.shortcutsEnabled === "boolean" ? source.shortcutsEnabled : true,
    onboardingDismissed: typeof source.onboardingDismissed === "boolean" ? source.onboardingDismissed : false,
    commandUses: typeof source.commandUses === "number" ? source.commandUses : 0,
    focusUses: typeof source.focusUses === "number" ? source.focusUses : 0,
    lastSurpriseHref: typeof source.lastSurpriseHref === "string" ? source.lastSurpriseHref : null,
  };
}

const QolContext = createContext<QolContextValue | null>(null);

export function QolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QolPersistedState>(defaultState);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [centerView, setCenterView] = useState<QolCenterView>("overview");
  const pathname = usePathname();
  const trackedPath = useRef<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const normalized = normalizeState(JSON.parse(raw));
          if (normalized) {
            setState((current) => ({
              ...normalized,
              // GamesHub can register its live catalog before the first storage
              // frame runs. Never let an older empty snapshot erase that work.
              registry: current.registry.length ? current.registry : normalized.registry,
            }));
          }
        }
      } catch {
        // A corrupt local preference should never block the arcade.
      }
      setOnline(navigator.onLine);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in strict privacy modes; keep the session usable.
    }
  }, [ready, state]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.qolDensity = state.density;
    document.documentElement.dataset.focusMode = state.focus.interfaceFocus ? "true" : "false";
  }, [state.density, state.focus.interfaceFocus]);

  useEffect(() => {
    if (!ready || trackedPath.current === pathname || pathname.startsWith("/admin")) return;
    trackedPath.current = pathname;
    const now = Date.now();

    setState((current) => {
      const game = current.registry.find((item) => item.links.some((link) => link.href === pathname));
      const primaryHref = game?.links[0]?.href ?? pathname;
      const route: QolRoute = {
        href: pathname,
        label: game?.title ?? routeLabel(pathname),
        visitedAt: now,
        kind: game ? "game" : "route",
        emoji: game?.emoji,
      };
      const recent = [route, ...current.recent.filter((item) => item.href !== pathname)].slice(0, MAX_RECENT);
      if (!game) return { ...current, recent };

      const today = localDate();
      const goal = current.dailyGoal.date === today
        ? { ...current.dailyGoal }
        : {
            ...current.dailyGoal,
            date: today,
            progress: 0,
            streak:
              current.dailyGoal.lastCompletedDate === yesterdayOf(today)
                ? current.dailyGoal.streak
                : 0,
          };
      goal.progress += 1;
      if (goal.progress >= goal.target && goal.lastCompletedDate !== today) {
        goal.streak += 1;
        goal.lastCompletedDate = today;
      }

      return {
        ...current,
        recent,
        lastPlayed: route,
        playCounts: {
          ...current.playCounts,
          [primaryHref]: (current.playCounts[primaryHref] ?? 0) + 1,
        },
        dailyGoal: goal,
      };
    });
  }, [pathname, ready]);

  const registerGames = useCallback((games: QolGame[]) => {
    setState((current) => {
      const currentSignature = current.registry.map((game) => `${game.title}:${game.links[0]?.href}`).join("|");
      const nextSignature = games.map((game) => `${game.title}:${game.links[0]?.href}`).join("|");
      return currentSignature === nextSignature ? current : { ...current, registry: games };
    });
  }, []);

  const toggleFavorite = useCallback((game: QolGame) => {
    const href = game.links[0]?.href;
    if (!href) return;
    setState((current) => {
      const favorites = { ...current.favorites };
      if (favorites[href]) delete favorites[href];
      else favorites[href] = game;
      return { ...current, favorites };
    });
  }, []);

  const isFavorite = useCallback((href: string) => Boolean(state.favorites[href]), [state.favorites]);

  const pinRoute = useCallback((route: Pick<QolRoute, "href" | "label"> & Partial<Pick<QolRoute, "emoji" | "kind">>) => {
    setState((current) => {
      const exists = current.pins.some((item) => item.href === route.href);
      return {
        ...current,
        pins: exists
          ? current.pins.filter((item) => item.href !== route.href)
          : [
              ...current.pins,
              {
                href: route.href,
                label: route.label,
                emoji: route.emoji,
                kind: route.kind ?? "route",
                visitedAt: Date.now(),
              },
            ].slice(0, 12),
      };
    });
  }, []);

  const isPinned = useCallback((href: string) => state.pins.some((item) => item.href === href), [state.pins]);
  const clearRecent = useCallback(() => setState((current) => ({ ...current, recent: [] })), []);

  const addSearch = useCallback((query: string) => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    setState((current) => ({
      ...current,
      searchHistory: [normalized, ...current.searchHistory.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8),
    }));
  }, []);

  const clearSearchHistory = useCallback(() => setState((current) => ({ ...current, searchHistory: [] })), []);

  const createCollection = useCallback((name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    setState((current) => ({
      ...current,
      collections: [
        ...current.collections,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: normalized.slice(0, 36), gameHrefs: [], createdAt: Date.now() },
      ],
    }));
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setState((current) => ({ ...current, collections: current.collections.filter((item) => item.id !== id) }));
  }, []);

  const toggleCollectionGame = useCallback((collectionId: string, href: string) => {
    setState((current) => ({
      ...current,
      collections: current.collections.map((collection) =>
        collection.id !== collectionId
          ? collection
          : {
              ...collection,
              gameHrefs: collection.gameHrefs.includes(href)
                ? collection.gameHrefs.filter((item) => item !== href)
                : [...collection.gameHrefs, href],
            },
      ),
    }));
  }, []);

  const setDailyTarget = useCallback((target: 1 | 3 | 5) => {
    setState((current) => ({ ...current, dailyGoal: { ...current.dailyGoal, target } }));
  }, []);

  const startFocus = useCallback((minutes: 15 | 25 | 45) => {
    setState((current) => ({
      ...current,
      focusUses: current.focusUses + 1,
      focus: {
        ...current.focus,
        durationMinutes: minutes,
        remainingSeconds: minutes * 60,
        endsAt: Date.now() + minutes * 60 * 1000,
      },
    }));
  }, []);

  const pauseFocus = useCallback(() => {
    setState((current) => ({
      ...current,
      focus: {
        ...current.focus,
        remainingSeconds: current.focus.endsAt
          ? Math.max(0, Math.ceil((current.focus.endsAt - Date.now()) / 1000))
          : current.focus.remainingSeconds,
        endsAt: null,
      },
    }));
  }, []);

  const resumeFocus = useCallback(() => {
    setState((current) => ({
      ...current,
      focus: {
        ...current.focus,
        endsAt: current.focus.remainingSeconds > 0 ? Date.now() + current.focus.remainingSeconds * 1000 : null,
      },
    }));
  }, []);

  const stopFocus = useCallback(() => {
    setState((current) => ({
      ...current,
      focus: {
        ...current.focus,
        endsAt: null,
        remainingSeconds: current.focus.durationMinutes * 60,
      },
    }));
  }, []);

  const setInterfaceFocus = useCallback((enabled: boolean) => {
    setState((current) => ({ ...current, focus: { ...current.focus, interfaceFocus: enabled } }));
  }, []);

  const setDensity = useCallback((density: QolDensity) => setState((current) => ({ ...current, density })), []);
  const setNavHidden = useCallback((href: string, hidden: boolean) => {
    setState((current) => ({
      ...current,
      hiddenNav: hidden
        ? Array.from(new Set([...current.hiddenNav, href]))
        : current.hiddenNav.filter((item) => item !== href),
    }));
  }, []);
  const restoreNavigation = useCallback(() => setState((current) => ({ ...current, hiddenNav: [] })), []);
  const setShortcutsEnabled = useCallback((enabled: boolean) => setState((current) => ({ ...current, shortcutsEnabled: enabled })), []);
  const dismissOnboarding = useCallback((dismissed: boolean) => setState((current) => ({ ...current, onboardingDismissed: dismissed })), []);

  const openPalette = useCallback(() => {
    setState((current) => ({ ...current, commandUses: current.commandUses + 1 }));
    setPaletteOpen(true);
  }, []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openCenter = useCallback((view: QolCenterView = "overview") => {
    setCenterView(view);
    setCenterOpen(true);
  }, []);
  const closeCenter = useCallback(() => setCenterOpen(false), []);
  const setLastSurprise = useCallback((href: string) => setState((current) => ({ ...current, lastSurpriseHref: href })), []);
  const updateWebsite = useCallback((patch: Partial<WebsitePreferences>) => {
    setState((current) => ({ ...current, website: { ...current.website, ...patch } }));
  }, []);
  const setPageNote = useCallback((notePathname: string, note: string) => {
    const normalizedPathname = notePathname.startsWith("/") ? notePathname : "/";
    setState((current) => ({
      ...current,
      pageNotes: {
        ...current.pageNotes,
        [normalizedPathname]: note.slice(0, 2000),
      },
    }));
  }, []);
  const clearPageNote = useCallback((notePathname: string) => {
    setState((current) => {
      const pageNotes = { ...current.pageNotes };
      delete pageNotes[notePathname];
      return { ...current, pageNotes };
    });
  }, []);
  const resetWebsitePreferences = useCallback(() => {
    setState((current) => ({ ...current, website: { ...DEFAULT_WEBSITE_PREFERENCES } }));
  }, []);

  const importState = useCallback((value: unknown) => {
    const normalized = normalizeState(value);
    if (!normalized) return false;
    setState(normalized);
    return true;
  }, []);
  const resetState = useCallback(() => setState(defaultState()), []);

  const onboardingProgress = useMemo(() => {
    const steps = [
      state.recent.some((item) => item.href === "/play"),
      Object.keys(state.favorites).length > 0,
      state.commandUses > 0,
      state.focusUses > 0,
    ];
    return Math.round((steps.filter(Boolean).length / steps.length) * 100);
  }, [state.commandUses, state.favorites, state.focusUses, state.recent]);

  const value = useMemo<QolContextValue>(() => ({
    state,
    ready,
    online,
    paletteOpen,
    centerOpen,
    centerView,
    registerGames,
    toggleFavorite,
    isFavorite,
    pinRoute,
    isPinned,
    clearRecent,
    addSearch,
    clearSearchHistory,
    createCollection,
    deleteCollection,
    toggleCollectionGame,
    setDailyTarget,
    startFocus,
    pauseFocus,
    resumeFocus,
    stopFocus,
    setInterfaceFocus,
    setDensity,
    setNavHidden,
    restoreNavigation,
    setShortcutsEnabled,
    dismissOnboarding,
    onboardingProgress,
    openPalette,
    closePalette,
    openCenter,
    closeCenter,
    setLastSurprise,
    updateWebsite,
    setPageNote,
    clearPageNote,
    resetWebsitePreferences,
    importState,
    resetState,
  }), [
    addSearch,
    centerOpen,
    centerView,
    clearRecent,
    clearSearchHistory,
    clearPageNote,
    closeCenter,
    closePalette,
    createCollection,
    deleteCollection,
    dismissOnboarding,
    importState,
    isFavorite,
    isPinned,
    online,
    onboardingProgress,
    openCenter,
    openPalette,
    paletteOpen,
    pauseFocus,
    pinRoute,
    ready,
    registerGames,
    resetWebsitePreferences,
    resetState,
    restoreNavigation,
    resumeFocus,
    setDailyTarget,
    setDensity,
    setInterfaceFocus,
    setLastSurprise,
    setPageNote,
    setNavHidden,
    setShortcutsEnabled,
    startFocus,
    state,
    stopFocus,
    toggleCollectionGame,
    toggleFavorite,
    updateWebsite,
  ]);

  return <QolContext.Provider value={value}>{children}</QolContext.Provider>;
}

export function useQol(): QolContextValue {
  const context = useContext(QolContext);
  if (!context) throw new Error("useQol must be used within <QolProvider>");
  return context;
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
