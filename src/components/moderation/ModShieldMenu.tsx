"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconShield } from "@/components/ui/icons";

export function ModShieldMenu({
  canModerateCurrentGame,
  onModerate,
  flaggedCount = 0,
}: {
  canModerateCurrentGame: boolean;
  onModerate: () => void;
  flaggedCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn btn-ghost relative !px-2.5"
        onClick={() => setOpen((v) => !v)}
        aria-label="Moderator menu"
        title="Moderator menu"
      >
        <IconShield width={16} height={16} />
        {flaggedCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--bad)] text-[9px] font-bold text-white">
            {flaggedCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#14171f] py-1 shadow-xl">
          <button
            disabled={!canModerateCurrentGame}
            onClick={() => {
              setOpen(false);
              onModerate();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Moderate this game
          </button>
          <Link
            href="/mod/live"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
          >
            Browse other live games
          </Link>
        </div>
      )}
    </div>
  );
}
