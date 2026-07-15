"use client";

import Link from "next/link";
import { useActiveOnlineGame } from "@/lib/hooks/useActiveOnlineGame";
import { IconChess } from "./icons";

/** Header link back to an in-progress online game, if the signed-in user has one. Polls rather than holding a permanent socket open. */
export function ActiveGameIndicator() {
  const roomId = useActiveOnlineGame();

  if (!roomId) return null;

  return (
    <Link
      href={`/play/online?room=${roomId}`}
      className="btn btn-ghost !gap-1.5 !px-2.5 !text-xs !text-[var(--accent)]"
      title="Resume your in-progress game"
    >
      <IconChess width={14} height={14} />
      Resume game
    </Link>
  );
}
