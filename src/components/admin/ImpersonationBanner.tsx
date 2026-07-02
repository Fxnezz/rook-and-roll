"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

/**
 * Persistent, unmissable banner shown the entire time an admin is impersonating
 * a user, so it is never ambiguous who is driving. Clicking it exits back to
 * the admin's own session.
 */
export function ImpersonationBanner() {
  const { data: session } = useSession();
  const [exiting, setExiting] = useState(false);
  if (!session?.user?.imp) return null;

  return (
    <button
      onClick={async () => {
        setExiting(true);
        await fetch("/api/admin/impersonate/stop", { method: "POST" }).catch(() => {});
        window.location.href = "/admin/users";
      }}
      className="sticky top-0 z-[90] flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
      style={{ background: "var(--bad)", color: "#fff" }}
    >
      <span>👁 Viewing as {session.user.username ?? session.user.name ?? "user"} — admin impersonation active.</span>
      <span className="underline">{exiting ? "Exiting…" : "Click to exit"}</span>
    </button>
  );
}
