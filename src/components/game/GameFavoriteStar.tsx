"use client";

import { useState } from "react";
import { IconStar } from "@/components/ui/icons";

/** Star/bookmark toggle for a game-history row — PATCHes /api/games/[id], optimistic with rollback on failure. */
export function GameFavoriteStar({ gameId, initialFavorited }: { gameId: string; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    const next = !favorited;
    setFavorited(next);
    setPending(true);
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited: next }),
      });
      if (!res.ok) setFavorited(!next);
    } catch {
      setFavorited(!next);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      className="hover-lift shrink-0 rounded-md p-2 transition-colors"
      style={{ color: favorited ? "#e5b13a" : "var(--text-faint)" }}
    >
      <IconStar width={16} height={16} fill={favorited ? "#e5b13a" : "none"} />
    </button>
  );
}
