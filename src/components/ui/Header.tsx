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

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const openSettings = () => {
    setSettingsLoaded(true);
    setSettingsOpen(true);
  };

  return (
    <>
      <aside aria-label="Site navigation" className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[var(--border)] bg-[var(--bg)]/95 px-3 pb-3 pt-4 shadow-[var(--shadow-sm)] backdrop-blur md:flex">
        <Link href="/" className="group mb-5 flex px-2 transition-transform duration-200 hover:translate-x-0.5">
          <Wordmark />
        </Link>

        <nav aria-label="Primary navigation" className="flex flex-col gap-1">
          {NAV.map((item) => {
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
          <button
            className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
            onClick={() => {
              setMenuOpen(false);
              openSettings();
            }}
          >
            <IconSettings width={17} height={17} />
            Settings
          </button>
        }
      >
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item, index) => {
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
          <div className="stagger-item-side mx-3 mt-2 flex items-center gap-3 rounded-lg bg-[var(--bg-elev)] px-4 py-3" style={{ "--i": NAV.length } as React.CSSProperties}>
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
