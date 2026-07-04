"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import {
  BOARDGAMES_SOCKET_URL,
  type BgClientToServerEvents,
  type BgServerToClientEvents,
  type BgLiveRoomSummary,
} from "@/lib/boardgames/protocol";

type S = Socket<BgServerToClientEvents, BgClientToServerEvents>;

const KIND_LABEL: Record<string, string> = {
  tictactoe: "Tic-Tac-Toe",
  connect4: "Connect Four",
  checkers: "Checkers",
  othello: "Othello",
};

export default function AdminLiveBoardGamesPage() {
  const socketRef = useRef<S | null>(null);
  const [status, setStatus] = useState<"connecting" | "ok" | "denied">("connecting");
  const [games, setGames] = useState<BgLiveRoomSummary[]>([]);

  useEffect(() => {
    let s: S;
    (async () => {
      const { token } = await fetch("/api/admin/socket-token").then((r) => r.json());
      s = io(BOARDGAMES_SOCKET_URL, { transports: ["websocket"] });
      socketRef.current = s;
      s.on("connect", () => s.emit("admin:hello", { token }));
      s.on("admin:ok", ({ games }) => {
        setStatus("ok");
        setGames(games);
      });
      s.on("admin:denied", () => setStatus("denied"));
      s.on("admin:games", ({ games }) => setGames(games));
    })();
    return () => {
      s?.disconnect();
    };
  }, []);

  const refresh = () => socketRef.current?.emit("admin:games");
  const clearChat = (roomId: string) => socketRef.current?.emit("admin:clearChat", { roomId });
  const kick = (userId: string, username: string) => {
    if (!confirm(`Kick ${username}? They can rejoin matchmaking after 5 minutes.`)) return;
    socketRef.current?.emit("admin:kick", {
      userId,
      cooldownMs: 300_000,
      message: "Removed by a moderator.",
    });
  };

  if (status === "denied") {
    return <div className="p-10 text-center text-[var(--bad)]">Admin token rejected.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold">Board games · live moderation</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Connect Four, Tic-Tac-Toe, Checkers. Light-touch only — clear chat or kick a player;
            bans/mutes are still managed from Users.
          </p>
        </div>
        <button className="btn" onClick={refresh}>
          Refresh ({games.length})
        </button>
      </div>

      {status === "connecting" && <p className="text-[var(--text-muted)]">Connecting to realtime server…</p>}

      <div className="panel overflow-hidden">
        {games.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">No live board-game rooms.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {games.map((g) => (
              <div key={g.roomId} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="chip !px-2 !py-0.5 text-xs">{KIND_LABEL[g.kind] ?? g.kind}</span>
                <span className="font-semibold">
                  {g.a} vs {g.b}
                </span>
                <span className="text-xs text-[var(--text-faint)]">
                  {g.moveCount} moves · 👁 {g.spectators}
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    className="rounded border border-[var(--border-strong)] px-2 py-1 text-xs font-semibold"
                    onClick={() => clearChat(g.roomId)}
                  >
                    Clear chat
                  </button>
                  <button
                    className="rounded border border-[var(--border-strong)] px-2 py-1 text-xs font-semibold"
                    onClick={() => kick(g.aUserId, g.a)}
                  >
                    Kick {g.a}
                  </button>
                  <button
                    className="rounded border border-[var(--border-strong)] px-2 py-1 text-xs font-semibold"
                    onClick={() => kick(g.bUserId, g.b)}
                  >
                    Kick {g.b}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
