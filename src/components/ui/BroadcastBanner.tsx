"use client";

import { useEffect, useState } from "react";
import type { Broadcast } from "@/lib/admin/config";

/**
 * Site-wide announcement banner. Rendered server-side from persisted config so
 * it shows for everyone who loads the site, and dismissible per-broadcast
 * (remembered in localStorage by id).
 */
export function BroadcastBanner({ broadcast }: { broadcast: Broadcast }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(`rr.bc.${broadcast.id}`) === "1");
  }, [broadcast.id]);

  if (dismissed) return null;
  const warn = broadcast.level === "warning";

  return (
    <div
      className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold"
      style={{
        background: warn ? "rgba(229,177,58,0.15)" : "rgba(90,168,224,0.15)",
        color: warn ? "var(--warn)" : "var(--info)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span>{broadcast.message}</span>
      <button
        onClick={() => {
          localStorage.setItem(`rr.bc.${broadcast.id}`, "1");
          setDismissed(true);
        }}
        className="opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
