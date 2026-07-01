"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./Logo";
import { IconSettings } from "./icons";
import { SlideOver } from "./SlideOver";
import { UserMenu } from "./UserMenu";
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
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-4">
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
    </header>
  );
}
