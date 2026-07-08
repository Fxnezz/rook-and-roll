"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Wordmark } from "./Logo";
import { IconSettings, IconChess, IconRobot, IconUsers, IconGrid, IconPuzzle, IconTrophy, IconShield } from "./icons";
import { SlideOver } from "./SlideOver";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

const NAV = [
  { href: "/play/online", label: "Play Chess", icon: IconChess },
  { href: "/play/bot", label: "Bots", icon: IconRobot },
  { href: "/play/local", label: "Pass & Play", icon: IconUsers },
  { href: "/play", label: "Games Hub", icon: IconGrid },
  { href: "/puzzles", label: "Puzzles", icon: IconPuzzle },
  { href: "/leaderboard", label: "Leaderboard", icon: IconTrophy },
];

// The bare hub link ("/play") needs an exact match so it doesn't also light
// up on every /play/* sub-route (online, bot, local, etc.).
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
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  // close the mobile menu on navigation
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            className="btn btn-ghost !p-2 md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <HamburgerIcon open={menuOpen} />
          </button>
          <Link href="/" className="group transition-transform duration-200 hover:scale-[1.03] active:scale-95">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="btn btn-ghost relative !gap-1.5 !px-3 !text-[var(--text-muted)] transition-colors duration-150 hover:!text-[var(--text)]"
                  style={active ? { color: "var(--accent)", background: "var(--bg-elev)" } : undefined}
                >
                  <item.icon width={16} height={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          {session?.user?.isModerator && (
            <Link href="/mod/live" className="btn btn-ghost !p-2" aria-label="Live games (moderator)" title="Live games">
              <IconShield width={16} height={16} />
            </Link>
          )}
          <NotificationBell />
          <button
            className="group btn btn-ghost !p-2"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <span className="inline-flex transition-transform duration-500 group-hover:rotate-90" style={{ transitionTimingFunction: "var(--ease-smooth)" }}>
              <IconSettings />
            </span>
          </button>
          <UserMenu />
        </div>
      </div>

      <SlideOver open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <SettingsPanel />
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
              setSettingsOpen(true);
            }}
          >
            <IconSettings width={17} height={17} />
            Settings
          </button>
        }
      >
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item, i) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`stagger-item-side flex items-center gap-3 rounded-lg px-4 py-3 text-base font-semibold transition-colors ${
                  active
                    ? "bg-[var(--bg-elev-2)] text-[var(--accent)]"
                    : "text-[var(--text)] hover:bg-[var(--bg-elev)]"
                }`}
                style={{ "--i": i } as React.CSSProperties}
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
    </header>
  );
}
