"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hidden admin entry point. Listens for a key sequence anywhere on the site
 * and, on a match, reveals a password prompt. This is a UI convenience ONLY —
 * discovering the sequence grants nothing. The password is checked server-side
 * (/api/admin/login) and access is gated by an httpOnly admin cookie. There is
 * no admin link anywhere in the UI, nav, sitemap, or robots.txt.
 *
 * Sequence (Konami code): ↑ ↑ ↓ ↓ ← → ← → b a
 */
const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
const RESET_MS = 2000;

export function AdminGate() {
  const [open, setOpen] = useState(false);
  const posRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore while typing into a field
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      const expected = SEQUENCE[posRef.current];
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === expected) {
        posRef.current += 1;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => (posRef.current = 0), RESET_MS);
        if (posRef.current === SEQUENCE.length) {
          posRef.current = 0;
          setOpen(true);
        }
      } else {
        // restart, but allow the mismatched key to be the start of a new attempt
        posRef.current = key === SEQUENCE[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!open) return null;
  return <AdminLoginModal onClose={() => setOpen(false)} />;
}

function AdminLoginModal({ onClose }: { onClose: () => void }) {
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
        window.location.href = "/admin";
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 animate-fade"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="panel w-full max-w-xs p-6 animate-pop"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <h2 className="font-bold">Restricted</h2>
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
          {loading ? "…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
