"use client";

import { useEffect, useRef, useState } from "react";
import { useCheatAccess } from "@/lib/cheats/access";
import { ADMIN_KEY_SEQUENCE, ADMIN_KEY_SEQUENCE_RESET_MS } from "@/lib/admin/keySequence";

/**
 * Same Konami-code shortcut as the bot page's cheat panel and the moderator
 * god-mode panel, but gated on useCheatAccess().isTargetAccount instead —
 * the single hardcoded owner account, decoupled from isModerator/isAdmin.
 * Reveals a floating button that opens the owner's full cheat/troll panel
 * (mod:cheat:* + owner:troll* events) for their own current online game.
 * Distinct emoji (👑) from the bot page's 🍪 and the moderator panel's 🛠️.
 */
export function OwnerCheatGate({ panelOpen, onOpen }: { panelOpen: boolean; onOpen: () => void }) {
  const { isTargetAccount } = useCheatAccess();
  const [revealed, setRevealed] = useState(false);
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
          onOpen();
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
  }, [isTargetAccount, onOpen]);

  if (!isTargetAccount || !revealed || panelOpen) return null;
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-32 z-[85] flex h-11 w-11 items-center justify-center rounded-full bg-[#14171f] text-lg shadow-lg ring-1 ring-white/15 hover:ring-white/30"
      aria-label="Open owner cheat panel"
    >
      👑
    </button>
  );
}
