"use client";

import { useEffect, useRef, useState } from "react";
import { ADMIN_KEY_SEQUENCE, ADMIN_KEY_SEQUENCE_RESET_MS } from "@/lib/admin/keySequence";
import { useCheatAccess } from "@/lib/cheats/access";

/**
 * Same Konami-code key sequence as the admin panel's shortcut, but unlocks
 * IN PLACE instead of navigating to /admin, since this is meant to be
 * toggled mid-game. Gated purely on the one designated cheat account — no
 * password step. Renders nothing at all for any other account — the
 * key-sequence listener isn't even attached for anyone else.
 */
export function CheatGate({ children }: { children: (open: boolean, setOpen: (v: boolean) => void) => React.ReactNode }) {
  const { isTargetAccount } = useCheatAccess();
  const [revealed, setRevealed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const posRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isTargetAccount) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      const expected = ADMIN_KEY_SEQUENCE[posRef.current];
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === expected) {
        posRef.current += 1;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => (posRef.current = 0), ADMIN_KEY_SEQUENCE_RESET_MS);
        if (posRef.current === ADMIN_KEY_SEQUENCE.length) {
          posRef.current = 0;
          setRevealed(true);
          setPanelOpen(true);
        }
      } else {
        posRef.current = key === ADMIN_KEY_SEQUENCE[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTargetAccount]);

  // The underlying game must always render for everyone — this component
  // only ever ADDS the lock UI on top for the one designated account, and
  // only after the Konami code has been entered once this session. It must
  // never gate the actual page content.
  const gateUi =
    isTargetAccount && revealed && !panelOpen ? (
      <button
        onClick={() => setPanelOpen(true)}
        className="fixed bottom-4 right-4 z-[85] flex h-11 w-11 items-center justify-center rounded-full bg-[#14171f] text-lg shadow-lg ring-1 ring-white/15 hover:ring-white/30"
        aria-label="Open cheat panel"
      >
        🍪
      </button>
    ) : null;

  return (
    <>
      {gateUi}
      {children(isTargetAccount && panelOpen, setPanelOpen)}
    </>
  );
}
