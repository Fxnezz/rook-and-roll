"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./Logo";
import { IconSettings } from "./icons";
import { SlideOver } from "./SlideOver";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

const NAV = [
  { href: "/play/online", label: "Play" },
  { href: "/play/bot", label: "Bots" },
  { href: "/play/local", label: "Pass & Play" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`btn btn-ghost !px-3 ${active ? "text-[var(--accent)]" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            className="btn btn-ghost !p-2"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <IconSettings />
          </button>
          <UserMenu />
        </div>
      </div>

      <SlideOver open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <SettingsPanel />
      </SlideOver>

      <SlideOver open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-3 text-base font-semibold transition-colors ${
                  active
                    ? "bg-[var(--bg-elev-2)] text-[var(--accent)]"
                    : "text-[var(--text)] hover:bg-[var(--bg-elev)]"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SlideOver>
    </header>
  );
}
