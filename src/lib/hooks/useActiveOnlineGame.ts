"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL, type ClientToServerEvents, type ServerToClientEvents, type Identity } from "@/lib/online/protocol";

type PresenceSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const POLL_MS = 60_000;

/** Polls presence for the signed-in user's own in-progress online-game room, if any. Shared by ActiveGameIndicator (header link) and the homepage resume card. */
export function useActiveOnlineGame(): string | null {
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

  return roomId;
}
