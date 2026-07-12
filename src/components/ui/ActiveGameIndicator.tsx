"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL, type ClientToServerEvents, type ServerToClientEvents, type Identity } from "@/lib/online/protocol";
import { IconChess } from "./icons";

type PresenceSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const POLL_MS = 60_000;

/** Header link back to an in-progress online game, if the signed-in user has one. Polls rather than holding a permanent socket open. */
export function ActiveGameIndicator() {
  const { data: session, status } = useSession();
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const identity: Identity = { userId: session.user.id, username: session.user.username ?? session.user.name ?? "Player", rating: 1200, guest: false };

    let cancelled = false;
    const check = () => {
      const socket: PresenceSocket = io(SOCKET_URL, { transports: ["websocket"] });
      socket.on("connect", () => {
        socket.emit("presence:hello", { identity });
        socket.emit("presence:query", { userIds: [identity.userId] });
      });
      socket.on("presence:status", ({ playing }) => {
        if (!cancelled) setRoomId(playing?.[identity.userId] ?? null);
        socket.disconnect();
      });
      setTimeout(() => socket.disconnect(), 5000); // safety net if the server never responds
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, session]);

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
