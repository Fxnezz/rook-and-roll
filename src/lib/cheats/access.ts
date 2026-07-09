"use client";

import { useSession } from "next-auth/react";

/**
 * The only account the cheat panel is ever offered to. Scoped to bot games
 * only (see CheatPanel) — nothing here ever touches a real opponent's game.
 */
export const CHEAT_ACCOUNT_EMAIL = "sbyrnes1@student.johnxxiii.edu.au";

/** True only for the one designated account. */
export function useCheatAccess() {
  const { data: session } = useSession();
  const isTargetAccount = session?.user?.email?.toLowerCase() === CHEAT_ACCOUNT_EMAIL.toLowerCase();
  return { isTargetAccount };
}
