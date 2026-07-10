"use client";

import { useEffect, useRef } from "react";
import { IconClose } from "./icons";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ShortcutsHelpModal({
  onClose,
  showDraw = false,
  showChat = false,
}: {
  onClose: () => void;
  showDraw?: boolean;
  showChat?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable ?? panel)?.focus();
    return () => {
      previouslyFocused.current?.focus();
    };
  }, []);

  const rows: [string, string][] = [
    ["F", "Flip board"],
    ["← / →", "Step through move history"],
    ["Home / End", "Jump to start / latest move"],
    ...(showDraw ? ([["D", "Offer draw"], ["A", "Accept a pending draw offer"]] as [string, string][]) : []),
    ...(showChat ? ([["/", "Focus the chat input"]] as [string, string][]) : []),
    ["?", "Toggle this help"],
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 animate-fade" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        className="panel w-full max-w-sm p-5 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Keyboard shortcuts</h2>
          <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close">
            <IconClose width={16} height={16} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">{label}</span>
              <kbd className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-elev)] px-2 py-0.5 font-mono text-xs">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
