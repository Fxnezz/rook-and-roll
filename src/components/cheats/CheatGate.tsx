"use client";

import { useEffect, useRef, useState } from "react";
import { ADMIN_KEY_SEQUENCE, ADMIN_KEY_SEQUENCE_RESET_MS } from "@/lib/admin/keySequence";
import { useCheatAccess } from "@/lib/cheats/access";

/**
 * Same key-sequence + password unlock as the admin panel (reuses
 * /api/admin/login and the same rr_admin cookie — no second secret), but
 * unlocks IN PLACE instead of navigating to /admin, since this is meant to
 * be toggled mid-game. Renders nothing at all for any account other than
 * the one designated cheat account — the key-sequence listener isn't even
 * attached for anyone else.
 */
export function CheatGate({ children }: { children: (open: boolean, setOpen: (v: boolean) => void) => React.ReactNode }) {
  const { isTargetAccount, adminUnlocked, checked, markUnlocked } = useCheatAccess();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
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
          if (adminUnlocked) setPanelOpen(true);
          else setShowPasswordPrompt(true);
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
  }, [isTargetAccount, adminUnlocked]);

  // The underlying game must always render for everyone — this component
  // only ever ADDS the lock UI on top for the one designated account. It
  // must never gate the actual page content.
  const gateUi =
    isTargetAccount && checked ? (
      <>
        {showPasswordPrompt && (
          <CheatPasswordModal
            onClose={() => setShowPasswordPrompt(false)}
            onSuccess={() => {
              markUnlocked();
              setShowPasswordPrompt(false);
              setPanelOpen(true);
            }}
          />
        )}
        {adminUnlocked && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="fixed bottom-4 right-4 z-[85] flex h-11 w-11 items-center justify-center rounded-full bg-[#14171f] text-lg shadow-lg ring-1 ring-white/15 hover:ring-white/30"
            aria-label="Open cheat panel"
          >
            🍪
          </button>
        )}
      </>
    ) : null;

  return (
    <>
      {gateUi}
      {children(isTargetAccount && panelOpen, setPanelOpen)}
    </>
  );
}

function CheatPasswordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onSuccess();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Access denied.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 animate-fade" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="panel w-full max-w-xs p-6 animate-pop">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🍪</span>
          <h2 className="font-bold">Cheat Panel</h2>
        </div>
        <input
          autoFocus
          type="password"
          className="input !font-sans"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
        />
        {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
        <button className="btn btn-primary mt-4 w-full" disabled={loading || !password}>
          {loading ? "…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
