"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ADMIN_KEY_SEQUENCE as SEQUENCE, ADMIN_KEY_SEQUENCE_RESET_MS as RESET_MS } from "@/lib/admin/keySequence";
import { isAdminOwnerEmail } from "@/lib/admin/owner";

/**
 * Hidden admin entry point. Listens for a key sequence anywhere on the site
 * and, on a match for a signed-in isAdmin account, reveals a direct link to
 * /admin — the real gate is the account's isAdmin flag (checked server-side
 * in src/middleware.ts and src/app/admin/layout.tsx); the Konami code is now
 * just a fun shortcut, not a security boundary. For anyone else the listener
 * isn't even attached, and nothing is ever revealed.
 *
 * Sequence (Konami code): ↑ ↑ ↓ ↓ ← → ← → b a
 */

export function AdminGate() {
  const { data: session } = useSession();
  const isAdmin = isAdminOwnerEmail(session?.user?.email);
  const [open, setOpen] = useState(false);
  const posRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin]);

  if (!isAdmin || !open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 animate-fade" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="panel w-full max-w-xs p-6 text-center animate-pop">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="text-lg">🔓</span>
          <h2 className="font-bold">Admin</h2>
        </div>
        <a href="/admin" className="btn btn-primary w-full">
          Open admin dashboard
        </a>
        <button className="btn-ghost mt-2 w-full text-sm" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}
