"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "./Logo";
import { IconSettings } from "./icons";
import { SlideOver } from "./SlideOver";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/play/local" className="btn btn-ghost hidden sm:inline-flex">
            Pass &amp; Play
          </Link>
          <Link href="/play/bot" className="btn btn-ghost hidden sm:inline-flex">
            Bots
          </Link>
          <button
            className="btn btn-ghost !p-2"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <IconSettings />
          </button>
        </nav>
      </div>
      <SlideOver open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <SettingsPanel />
      </SlideOver>
    </header>
  );
}
