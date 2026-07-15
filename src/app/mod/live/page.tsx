"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import {
  SOCKET_URL,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type Identity,
  type LiveGameSummary,
} from "@/lib/online/protocol";
import { IconShield, IconRefresh } from "@/components/ui/icons";
import { usePinnedPlayers } from "@/lib/moderation/usePinnedPlayers";
import { isAdminOwnerEmail } from "@/lib/admin/owner";

type S = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Read-only "Live games" browser for the in-game moderator — a narrower,
 * non-admin-JWT sibling of /admin/live. Lets the moderator spectate any
 * public room (via the existing /watch/[roomId] page, which gets the same
 * mod controls in batch 7) instead of only ever seeing their own games.
 */
export default function ModLivePage() {
  const { data: session, status } = useSession();
  const socketRef = useRef<S | null>(null);
  const [games, setGames] = useState<LiveGameSummary[]>([]);
  const [connected, setConnected] = useState(false);
  const { isPinned, toggle } = usePinnedPlayers();

  const isModerator = isAdminOwnerEmail(session?.user?.email);

  useEffect(() => {
    if (!isModerator) return;
    const identity: Identity = {
      userId: session!.user.id,
      username: session!.user.username ?? session!.user.name ?? "Player",
      rating: 1200,
      guest: false,
    };
    const s: S = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = s;
    s.on("connect", () => {
      setConnected(true);
      s.emit("presence:hello", { identity });
      s.emit("mod:liveGames");
    });
    s.on("disconnect", () => setConnected(false));
    s.on("mod:liveGames", ({ games }) => setGames(games));
    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModerator]);

  const refresh = () => socketRef.current?.emit("mod:liveGames");

  if (status === "loading") return null;
  if (!isModerator) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-[var(--text-muted)]">
        <p>Not authorized.</p>
      </div>
    );
  }

  const sorted = [...games].sort((a, b) => {
    const aPinned = isPinned(a.white) || isPinned(a.black);
    const bPinned = isPinned(b.white) || isPinned(b.black);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return b.ply - a.ply;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <IconShield width={18} height={18} /> Live games
        </h1>
        <button className="btn btn-ghost !py-1.5 text-sm" onClick={refresh}>
          <IconRefresh width={14} height={14} /> Refresh
        </button>
      </div>
      <p className="mb-4 text-xs text-[var(--text-faint)]">{connected ? `${games.length} live game(s)` : "Connecting…"}</p>

      {sorted.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">No live games right now.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((g) => {
            const pinned = isPinned(g.white) || isPinned(g.black);
            return (
              <div
                key={g.roomId}
                className="panel flex items-center justify-between gap-3 px-4 py-3"
                style={pinned ? { borderColor: "var(--accent)" } : undefined}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <PinnablePlayer name={g.white} pinned={isPinned(g.white)} onToggle={() => toggle(g.white)} />
                    <span className="text-[var(--text-faint)]">vs</span>
                    <PinnablePlayer name={g.black} pinned={isPinned(g.black)} onToggle={() => toggle(g.black)} />
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                    {g.category} · {g.rated ? "rated" : "casual"} · ply {g.ply} · {g.spectators} watching
                    {g.reviewFlagged && <span className="ml-1.5 text-[var(--bad)]">· flagged for review</span>}
                  </p>
                </div>
                <Link href={`/watch/${g.roomId}`} className="btn !py-1.5 text-sm shrink-0">
                  Watch
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PinnablePlayer({ name, pinned, onToggle }: { name: string; pinned: boolean; onToggle: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {name}
      <button
        onClick={onToggle}
        className="text-xs opacity-60 hover:opacity-100"
        title={pinned ? "Unpin this player" : "Pin this player"}
        style={pinned ? { color: "var(--accent)" } : undefined}
      >
        {pinned ? "★" : "☆"}
      </button>
    </span>
  );
}
