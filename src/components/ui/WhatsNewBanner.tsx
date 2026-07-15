"use client";

import { useEffect, useState } from "react";
import { CHANGELOG, LATEST_CHANGELOG_VERSION } from "@/lib/changelog";
import { IconSparkles, IconClose } from "./icons";

const SEEN_KEY = "rr.whatsnew.seen";

/** Dismissible "what's new" banner for returning users — silent for first-time visitors, who have nothing to catch up on. */
export function WhatsNewBanner() {
  const [newEntries, setNewEntries] = useState<typeof CHANGELOG>([]);

  useEffect(() => {
    let lastSeen: string | null = null;
    try {
      lastSeen = localStorage.getItem(SEEN_KEY);
    } catch {
      return;
    }

    if (lastSeen === null) {
      // First-ever visit — nothing to catch up on, just record the current version.
      try {
        localStorage.setItem(SEEN_KEY, LATEST_CHANGELOG_VERSION);
      } catch {
        /* ignore */
      }
      return;
    }

    if (lastSeen === LATEST_CHANGELOG_VERSION) return;
    const idx = CHANGELOG.findIndex((e) => e.version === lastSeen);
    setNewEntries(idx === -1 ? CHANGELOG : CHANGELOG.slice(0, idx));
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, LATEST_CHANGELOG_VERSION);
    } catch {
      /* ignore */
    }
    setNewEntries([]);
  };

  if (newEntries.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[90] max-w-sm rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <IconSparkles width={16} height={16} className="text-[var(--accent)]" />
          What&apos;s new
        </div>
        <button onClick={dismiss} className="rounded p-0.5 text-[var(--text-faint)] hover:text-[var(--text)]" aria-label="Dismiss">
          <IconClose width={16} height={16} />
        </button>
      </div>
      <div className="mt-2 flex max-h-64 flex-col gap-3 overflow-y-auto">
        {newEntries.map((entry) => (
          <div key={entry.version}>
            <p className="text-xs font-semibold text-[var(--text-muted)]">{entry.date}</p>
            <ul className="mt-1 list-disc pl-4 text-sm">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button className="btn btn-primary mt-3 w-full !py-1.5 text-sm" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
