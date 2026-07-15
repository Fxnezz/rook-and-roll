"use client";

import Link from "next/link";
import { useActiveOnlineGame } from "@/lib/hooks/useActiveOnlineGame";
import { IconChess } from "./icons";

/** Homepage banner offering a one-click return to an in-progress online game — renders nothing otherwise. */
export function ResumeGameCard() {
  const roomId = useActiveOnlineGame();
  if (!roomId) return null;

  return (
    <Link
      href={`/play/online?room=${roomId}`}
      className="panel hover-lift mb-6 flex items-center justify-between gap-3 p-4"
      style={{ borderColor: "var(--accent)" }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
          <IconChess width={20} height={20} />
        </span>
        <div>
          <p className="text-sm font-semibold">Continue where you left off</p>
          <p className="text-xs text-[var(--text-muted)]">You have a game in progress</p>
        </div>
      </div>
      <span className="chip !px-2.5 !py-1 text-xs font-semibold">Resume →</span>
    </Link>
  );
}
