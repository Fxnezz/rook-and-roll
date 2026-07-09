"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

/**
 * Admin access is now tied directly to the signed-in account's isAdmin flag —
 * there's no separate elevated admin session to drop, so "sign out" here
 * means signing out of the account entirely.
 */
export function AdminLogoutButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="btn btn-danger"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await signOut({ callbackUrl: "/" });
      }}
    >
      {loading ? "…" : "Sign out"}
    </button>
  );
}
