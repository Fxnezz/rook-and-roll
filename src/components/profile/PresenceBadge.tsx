"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL, type ClientToServerEvents, type ServerToClientEvents, type Identity } from "@/lib/online/protocol";

type PresenceSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Small self-contained widget shown on a profile page: a one-shot presence
 * check (mirrors ActiveGameIndicator.tsx's pattern) for whether this specific
 * user is currently in a live game, with a Watch link if so. */
export function PresenceBadge({ userId }: { userId: string }) {
  const { data: session, status } = useSession();
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const identity: Identity = {
      userId: session.user.id,
      username: session.user.username ?? session.user.name ?? "Player",
      rating: 1200,
      guest: false,
    };

    let cancelled = false;
    const socket: PresenceSocket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit("presence:hello", { identity });
      socket.emit("presence:query", { userIds: [userId] });
    });
    socket.on("presence:status", ({ playing }) => {
      if (!cancelled) setRoomId(playing?.[userId] ?? null);
      socket.disconnect();
    });
    const timer = setTimeout(() => socket.disconnect(), 5000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      socket.disconnect();
    };
  }, [status, session, userId]);

  if (!roomId) return null;

  return (
    <Link href={`/watch/${roomId}`} className="chip !px-2.5 !py-1 text-xs">
      🎮 Currently playing · Watch
    </Link>
  );
}
