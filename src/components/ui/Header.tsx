"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Wordmark } from "./Logo";
import {
  IconChess,
  IconGrid,
  IconPuzzle,
  IconRobot,
  IconRook,
  IconSettings,
  IconShield,
  IconSparkles,
  IconTraining,
  IconTrophy,
  IconUsers,
} from "./icons";
import { SlideOver } from "./SlideOver";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { ActiveGameIndicator } from "./ActiveGameIndicator";
import { useQol } from "@/lib/qol/useQol";
import { isAdminOwnerEmail } from "@/lib/admin/owner";
import { OPEN_SETTINGS_EVENT, type SettingsTab } from "@/lib/settings/openSettings";

const SettingsPanel = dynamic(
  () => import("@/components/settings/SettingsPanel").then((mod) => mod.SettingsPanel),
  {
    loading: () => (
      <div className="grid min-h-56 place-items-center px-6 text-sm font-semibold text-[var(--text-muted)]" role="status">
        Loading settings…
      </div>
    ),
  },
);

const ShieldCenter = dynamic(
  () => import("@/components/admin/ShieldCenter").then((mod) => mod.ShieldCenter),
  { ssr: false },
);

const NAV = [
  { href: "/play/online", label: "Play Chess", icon: IconChess },
  { href: "/play/bot", label: "Bots", icon: IconRobot },
  { href: "/play/local", label: "Pass & Play", icon: IconUsers },
  { href: "/play", label: "Games Hub", icon: IconGrid },
  { href: "/puzzles", label: "Puzzles", icon: IconPuzzle },
  { href: "/training", label: "Training", icon: IconTraining },
  { href: "/analysis", label: "Analysis", icon: IconSparkles },
  { href: "/leaderboard", label: "Leaderboard", icon: IconTrophy },
];

const MOBILE_NAV = [
  { href: "/", label: "Home", icon: IconRook },
  { href: "/play", label: "Games", icon: IconGrid },
  { href: "/play/bot", label: "Bots", icon: IconRobot },
  { href: "/puzzles", label: "Puzzles", icon: IconPuzzle },
];

function isNavActive(pathname: string, href: string): boolean {
  return href === "/play" ? pathname === "/play" : pathname.startsWith(href);
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-4 w-5 flex-col items-center justify-center">
      <span
        className="absolute h-[2px] w-5 rounded-full bg-current transition-transform duration-300"
        style={{
          transitionTimingFunction: "var(--ease-smooth)",
          transform: open ? "translateY(0) rotate(45deg)" : "translateY(-6px) rotate(0deg)",
        }}
      />
      <span
        className="absolute h-[2px] w-5 rounded-full bg-current transition-all duration-200"
        style={{ opacity: open ? 0 : 1, transform: open ? "scaleX(0)" : "scaleX(1)" }}
      />
      <span
        className="absolute h-[2px] w-5 rounded-full bg-current transition-transform duration-300"
        style={{
          transitionTimingFunction: "var(--ease-smooth)",
          transform: open ? "translateY(0) rotate(-45deg)" : "translateY(6px) rotate(0deg)",
        }}
      />
    </span>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("motion");
  const [menuOpen, setMenuOpen] = useState(false);
  const [shieldOpen, setShieldOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { state: qol, openPalette } = useQol();
  const visibleNav = NAV.filter((item) => !qol.hiddenNav.includes(item.href));
  const isShieldOwner = isAdminOwnerEmail(session?.user?.email);
  const currentRoute = pathname === "/"
    ? "Home"
    : NAV.find((item) => isNavActive(pathname, item.href))?.label
      ?? pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ")
      ?? "Sam's Arcade";
  const showMobileDock = qol.website.mobileDock
    && !pathname.startsWith("/play/")
    && !pathname.startsWith("/watch/")
    && !pathname.startsWith("/admin")
    && !pathname.startsWith("/mod/")
    && pathname !== "/login"
    && pathname !== "/signup";

  const openSettings = (tab: SettingsTab = "motion") => {
    setSettingsTab(tab);
    setSettingsLoaded(true);
    setSettingsOpen(true);
  };

  useEffect(() => {
    const handleOpenSettings = (event: Event) => {
      setSettingsTab((event as CustomEvent<SettingsTab>).detail ?? "motion");
      setSettingsLoaded(true);
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, handleOpenSettings);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, handleOpenSettings);
  }, []);

  return (
    <>
      <aside aria-label="Site navigation" className="qol-focus-dim fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[var(--border)] bg-[var(--bg)]/95 px-3 pb-3 pt-4 shadow-[var(--shadow-sm)] backdrop-blur md:flex">
        <Link href="/" className="group mb-5 flex px-2 transition-transform duration-200 hover:translate-x-0.5">
          <Wordmark />
        </Link>

        <button
          type="button"
          onClick={openPalette}
          className="mb-3 flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-left text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
        >
          <SearchIcon />
          <span className="flex-1">Find anything</span>
          <kbd className="rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[0.58rem] text-[var(--text-faint)]">⌘K</kbd>
        </button>

        <Link href="/play" className="group mb-4 flex items-center gap-3 rounded-xl border border-[var(--accent)]/25 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_14%,var(--panel)),var(--panel))] p-3 transition hover:border-[var(--accent)]/55 hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[0_8px_20px_color-mix(in_srgb,var(--accent)_20%,transparent)]"><IconGrid width={19} height={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">Open the arcade</span>
            <span className="block text-[0.68rem] font-semibold text-[var(--text-faint)]">73 games · 26 online</span>
          </span>
          <span className="text-[var(--accent)] transition-transform group-hover:translate-x-0.5">›</span>
        </Link>

        <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-1">
          <p className="mb-1 px-3 text-[0.6rem] font-black uppercase tracking-[0.16em] text-[var(--text-faint)]">Play and improve</p>
          {visibleNav.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? "bg-[var(--bg-elev-2)] text-[var(--accent)] shadow-sm"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--bg-elev)] text-[var(--text-faint)] group-hover:text-[var(--accent)]"}`}>
                  <item.icon width={17} height={17} />
                </span>
                {item.label}
              </Link>
            );
          })}

          {qol.pins.length > 0 && (
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <p className="mb-1 px-3 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--text-faint)]">Pinned</p>
              {qol.pins.slice(0, 4).map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--bg-elev)] text-xs">{item.emoji ?? "★"}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="mt-auto border-t border-[var(--border)] pt-3">
          <ActiveGameIndicator />
          {isShieldOwner && (
            <button
              type="button"
              onClick={() => setShieldOpen(true)}
              className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/12 text-[var(--accent)]">
                <IconShield width={17} height={17} />
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-0.5 text-[8px] font-black text-[var(--accent-contrast)]">50</span>
              </span>
              Shield Center
            </button>
          )}
          <Link
            href="/quality-of-life"
            className="group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elev)] text-[var(--accent)]">
              ✦
              <span className="absolute -right-2 -top-1 rounded-full bg-[var(--good)] px-1 text-[7px] font-black uppercase text-white">New</span>
            </span>
            Patch Notes
          </Link>
          <button
            className="group mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
            onClick={() => openSettings()}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elev)] text-[var(--text-faint)] transition-transform duration-500 group-hover:rotate-90 group-hover:text-[var(--accent)]">
              <IconSettings width={17} height={17} />
            </span>
            Settings
          </button>
          {session?.user ? (
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel)] px-2.5 py-2">
              <NotificationBell />
              <span className="text-xs font-semibold text-[var(--text-faint)]">Account</span>
              <UserMenu />
            </div>
          ) : (
            <div className="flex justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-2 py-2">
              <UserMenu />
            </div>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur md:hidden">
        <div className="mx-auto flex h-14 items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="btn btn-ghost !p-2"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
            <Link href="/" className="min-w-0 transition-transform duration-200 active:scale-95">
              <Wordmark />
            </Link>
            <span className="hidden min-w-0 border-l border-[var(--border)] pl-2 text-xs font-black capitalize text-[var(--text-muted)] min-[430px]:block">{currentRoute}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button className="btn btn-ghost !p-2" onClick={openPalette} aria-label="Find games and pages">
              <SearchIcon />
            </button>
            {isShieldOwner && (
              <button type="button" onClick={() => setShieldOpen(true)} className="btn btn-ghost relative !p-2" aria-label="Open owner Shield Center with 50 moderation tools" title="Shield Center · 50 tools">
                <IconShield width={16} height={16} />
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-0.5 text-[8px] font-black text-[var(--accent-contrast)]">50</span>
              </button>
            )}
            <ActiveGameIndicator />
            <NotificationBell />
            <button
              className="group btn btn-ghost !p-2"
              onClick={() => openSettings()}
              aria-label="Settings"
            >
              <span className="inline-flex transition-transform duration-500 group-hover:rotate-90">
                <IconSettings />
              </span>
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {showMobileDock && (
        <nav className="mobile-command-dock fixed inset-x-2 bottom-2 z-50 grid grid-cols-5 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)]/94 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl md:hidden" aria-label="Mobile quick navigation">
          {MOBILE_NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : isNavActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`mobile-command-item ${active ? "mobile-command-item-active" : ""}`}>
                <item.icon width={18} height={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={openPalette} className="mobile-command-item" aria-label="Search games and pages">
            <SearchIcon />
            <span>Search</span>
          </button>
        </nav>
      )}

      <SlideOver open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings Control Center" size="wide">
        {settingsLoaded && <SettingsPanel key={settingsTab} canModerate={isShieldOwner} initialTab={settingsTab} />}
      </SlideOver>

      {isShieldOwner && <ShieldCenter open={shieldOpen} onClose={() => setShieldOpen(false)} />}

      <SlideOver
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menu"
        side="left"
        footer={
          <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
            <Link
              href="/quality-of-life"
              className="flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
              onClick={() => setMenuOpen(false)}
            >
              <span className="font-black text-[var(--accent)]">✦</span> Patch Notes
            </Link>
            <button
              className="flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
              onClick={() => {
                setMenuOpen(false);
                openSettings("motion");
              }}
            >
              <IconSettings width={17} height={17} /> Settings
            </button>
          </div>
        }
      >
        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item, index) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`stagger-item-side flex items-center gap-3 rounded-lg px-4 py-3 text-base font-semibold transition-colors ${
                  active
                    ? "bg-[var(--bg-elev-2)] text-[var(--accent)]"
                    : "text-[var(--text)] hover:bg-[var(--bg-elev)]"
                }`}
                style={{ "--i": index } as React.CSSProperties}
                onClick={() => setMenuOpen(false)}
              >
                <item.icon width={18} height={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {session?.user && (
          <div className="stagger-item-side mx-3 mt-2 flex items-center gap-3 rounded-lg bg-[var(--bg-elev)] px-4 py-3" style={{ "--i": visibleNav.length } as React.CSSProperties}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[var(--accent-contrast)]">
              {(session.user.username ?? session.user.name ?? "?")[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{session.user.username ?? session.user.name}</p>
              <Link href={`/u/${session.user.username ?? ""}`} className="text-xs text-[var(--text-faint)] hover:text-[var(--accent)]">
                View profile
              </Link>
            </div>
          </div>
        )}
        {isShieldOwner && (
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setShieldOpen(true);
            }}
            className="mx-3 mt-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-3 text-left text-sm font-bold text-[var(--accent)]"
          >
            <IconShield width={18} height={18} />
            <span className="flex-1">Shield Center</span>
            <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] text-[var(--accent-contrast)]">50 tools</span>
          </button>
        )}
      </SlideOver>
    </>
  );
}
