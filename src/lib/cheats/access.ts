"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * The only account the cheat panel is ever offered to. Scoped to bot games
 * only (see CheatPanel) — nothing here ever touches a real opponent's game.
 */
export const CHEAT_ACCOUNT_EMAIL = "sbyrnes1@student.johnxxiii.edu.au";

/**
 * True only for the one designated account, once the existing admin secret
 * (key sequence + password, checked server-side against ADMIN_PASSWORD_HASH)
 * has been unlocked in this browser. Reuses the exact same /api/admin/session
 * check the admin dashboard uses — no separate secret.
 */
export function useCheatAccess() {
  const { data: session } = useSession();
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  const isTargetAccount = session?.user?.email?.toLowerCase() === CHEAT_ACCOUNT_EMAIL.toLowerCase();

  useEffect(() => {
    if (!isTargetAccount) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setAdminUnlocked(Boolean(d.admin));
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isTargetAccount]);

  return {
    isTargetAccount,
    adminUnlocked,
    checked,
    /** Call right after a successful password check to avoid waiting on a re-poll. */
    markUnlocked: () => setAdminUnlocked(true),
  };
}
