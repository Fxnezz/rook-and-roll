"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ADMIN_KEY_SEQUENCE, ADMIN_KEY_SEQUENCE_RESET_MS } from "@/lib/admin/keySequence";

/**
 * Same Konami-code shortcut as the bot page's cheat panel and the admin
 * dashboard, but gated on session.user.isModerator instead — reveals a
 * floating button that opens the moderator's own "god-mode" panel
 * (mod:cheat:* events, board/game/clock control on their own current game)
 * for online games. Distinct emoji (🛠️) from the bot page's 🍪.
 *
 * Unlike CheatGate (which wraps the whole bot page in a render-prop), this
 * takes panelOpen/onOpen from the caller so it can be dropped into an
 * existing page's JSX without restructuring it — it only ever renders the
 * floating unlock button, nothing else. Renders nothing at all for
 * non-moderators — the key-sequence listener isn't even attached.
 */
export function ModCheatGate({ panelOpen, onOpen }: { panelOpen: boolean; onOpen: () => void }) {
  const { data: session } = useSession();
  const isModerator = Boolean(session?.user?.isModerator);
  const [revealed, setRevealed] = useState(false);
  const posRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isModerator) return;
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
  }, [isModerator, onOpen]);

  if (!isModerator || !revealed || panelOpen) return null;
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-20 z-[85] flex h-11 w-11 items-center justify-center rounded-full bg-[#14171f] text-lg shadow-lg ring-1 ring-white/15 hover:ring-white/30"
      aria-label="Open moderator god-mode panel"
    >
      🛠️
    </button>
  );
}
