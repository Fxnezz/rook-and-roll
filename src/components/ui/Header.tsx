"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Wordmark } from "./Logo";
import {
  IconChess,
  IconGrid,
  IconPuzzle,
  IconRobot,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { state: qol, online, openPalette, openCenter } = useQol();
  const visibleNav = NAV.filter((item) => !qol.hiddenNav.includes(item.href));

  const openSettings = () => {
    setSettingsLoaded(true);
    setSettingsOpen(true);
  };

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

        <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-1">
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
          {session?.user?.isModerator && (
            <Link
              href="/mod/live"
              className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elev)] text-[var(--text-faint)]">
                <IconShield width={17} height={17} />
              </span>
              Moderation
            </Link>
          )}
          <button
            className="group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
            onClick={() => openCenter()}
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elev)] text-[var(--accent)]">
              100
              <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--bg)] ${online ? "bg-[var(--good)]" : "bg-[var(--danger)]"}`} />
            </span>
            QOL Center
          </button>
          <button
            className="group mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
            onClick={openSettings}
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
          </div>
          <div className="flex items-center gap-0.5">
            <button className="btn btn-ghost !p-2" onClick={openPalette} aria-label="Find games and pages">
              <SearchIcon />
            </button>
            {session?.user?.isModerator && (
              <Link href="/mod/live" className="btn btn-ghost !p-2" aria-label="Live games (moderator)" title="Live games">
                <IconShield width={16} height={16} />
              </Link>
            )}
            <ActiveGameIndicator />
            <NotificationBell />
            <button
              className="group btn btn-ghost !p-2"
              onClick={openSettings}
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

      <SlideOver open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        {settingsLoaded && <SettingsPanel canModerate={Boolean(session?.user?.isModerator)} />}
      </SlideOver>

      <SlideOver
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menu"
        side="left"
        footer={
          <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
            <button
              className="flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
              onClick={() => {
                setMenuOpen(false);
                openCenter();
              }}
            >
              <span className="font-black text-[var(--accent)]">100</span> QOL Center
            </button>
            <button
              className="flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
              onClick={() => {
                setMenuOpen(false);
                openSettings();
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
      </SlideOver>
    </>
  );
}
