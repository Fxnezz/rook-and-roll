"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { IconUsers, IconCheck, IconClose } from "@/components/ui/icons";
import { TIME_CONTROLS, type TimeControl } from "@/lib/chess/useClock";
import { SOCKET_URL, type ClientToServerEvents, type ServerToClientEvents, type ChallengeInfo, type Identity } from "@/lib/online/protocol";
import { playSound } from "@/lib/chess/sound";

type PresenceSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface FriendUser {
  id: string;
  username: string | null;
  name: string | null;
}
interface FriendsData {
  friends: { friendshipId: string; user: FriendUser }[];
  incoming: { friendshipId: string; user: FriendUser; createdAt: string }[];
  outgoing: { friendshipId: string; user: FriendUser; createdAt: string }[];
}

function displayName(u: FriendUser) {
  return u.username ?? u.name ?? "Unknown";
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<FriendsData | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [challengeUserId, setChallengeUserId] = useState<string | null>(null);
  const [challengeTc, setChallengeTc] = useState<TimeControl>(TIME_CONTROLS[4]);
  const [challengeRated, setChallengeRated] = useState(false);
  const [outgoing, setOutgoing] = useState<{ challengeId: string; toUsername: string } | null>(null);
  const [incoming, setIncoming] = useState<ChallengeInfo | null>(null);
  const [challengeErr, setChallengeErr] = useState<string | null>(null);

  const socketRef = useRef<PresenceSocket | null>(null);
  const identityRef = useRef<Identity>({ userId: "", username: "", rating: 1200, guest: false });

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  // Presence + challenge socket — connected whenever the friends page is open.
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    identityRef.current = {
      userId: session.user.id,
      username: session.user.username ?? session.user.name ?? "Player",
      rating: 1200,
      guest: false,
    };
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) identityRef.current = { ...identityRef.current, rating: d.user.ratingBlitz ?? 1200 };
      })
      .catch(() => {});

    const socket: PresenceSocket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    const sayHello = () => socket.emit("presence:hello", { identity: identityRef.current });
    socket.on("connect", sayHello);
    sayHello();

    socket.on("presence:status", ({ online }) => setOnlineIds(new Set(online)));
    socket.on("challenge:received", (info) => {
      setIncoming(info);
      playSound("notify");
    });
    socket.on("challenge:declined", () => {
      setOutgoing(null);
      setChallengeErr("Your challenge was declined.");
    });
    socket.on("challenge:cancelled", () => setIncoming(null));
    socket.on("challenge:error", ({ message }) => {
      setChallengeErr(message);
      setOutgoing(null);
    });
    socket.on("queue:matched", ({ roomId }) => {
      router.push(`/play/online?room=${roomId}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, session, router]);

  // Re-query presence whenever the friend list changes.
  useEffect(() => {
    if (!data || !socketRef.current) return;
    const ids = data.friends.map((f) => f.user.id);
    if (ids.length) socketRef.current.emit("presence:query", { userIds: ids });
  }, [data]);

  if (status === "unauthenticated") redirect("/login");

  const sendRequest = async () => {
    setErr(null);
    setMsg(null);
    const username = usernameInput.trim();
    if (!username) return;
    setBusy("send");
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErr(body.error ?? "Something went wrong.");
      } else {
        setMsg(`Friend request sent to ${username}.`);
        setUsernameInput("");
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const accept = async (friendshipId: string) => {
    setBusy(friendshipId);
    try {
      await fetch(`/api/friends/${friendshipId}/accept`, { method: "POST" });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const decline = async (friendshipId: string) => {
    setBusy(friendshipId);
    try {
      await fetch(`/api/friends/${friendshipId}/decline`, { method: "POST" });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (friendshipId: string) => {
    setBusy(friendshipId);
    try {
      await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const sendChallenge = (toUserId: string, toUsername: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    setChallengeErr(null);
    const timeControl = {
      id: challengeTc.id,
      initialMs: challengeTc.initialMs,
      incrementMs: challengeTc.incrementMs,
      category: challengeTc.category,
    };
    socket.emit("challenge:send", { identity: identityRef.current, toUserId, timeControl, rated: challengeRated });
    setChallengeUserId(null);
    // Optimistic placeholder id; replaced implicitly once the recipient responds (we only need it to show "waiting").
    setOutgoing({ challengeId: `pending:${toUserId}:${Date.now()}`, toUsername });
  };

  const cancelOutgoing = () => {
    setOutgoing(null);
  };

  const acceptIncoming = () => {
    const socket = socketRef.current;
    if (!socket || !incoming) return;
    socket.emit("challenge:accept", { challengeId: incoming.id, identity: identityRef.current });
    setIncoming(null);
  };

  const declineIncoming = () => {
    const socket = socketRef.current;
    if (!socket || !incoming) return;
    socket.emit("challenge:decline", { challengeId: incoming.id });
    setIncoming(null);
  };

  const timedControls = useMemo(() => TIME_CONTROLS.filter((t) => t.category !== "untimed"), []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-bold">
        <IconUsers width={22} height={22} /> Friends
      </h1>

      {incoming && (
        <div className="panel mb-6 flex items-center gap-3 border-[var(--accent)] p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[var(--accent-contrast)]">
            {incoming.from.username[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{incoming.from.username} challenged you to a game</p>
            <p className="text-xs text-[var(--text-faint)]">
              {incoming.timeControl.id} {incoming.rated ? "· Rated" : "· Casual"}
            </p>
          </div>
          <button className="btn btn-primary !py-1.5" onClick={acceptIncoming}>
            Accept
          </button>
          <button className="btn btn-ghost !py-1.5" onClick={declineIncoming}>
            Decline
          </button>
        </div>
      )}

      {outgoing && (
        <div className="panel mb-6 flex items-center gap-3 p-4">
          <p className="min-w-0 flex-1 text-sm text-[var(--text-muted)]">
            Waiting for <span className="font-semibold text-[var(--text)]">{outgoing.toUsername}</span> to respond…
          </p>
          <button className="btn btn-ghost !py-1.5" onClick={cancelOutgoing}>
            Cancel
          </button>
        </div>
      )}

      {challengeErr && <p className="mb-4 text-sm text-[var(--bad)]">{challengeErr}</p>}

      <section className="panel mb-6 flex flex-col gap-2 p-4">
        <span className="label">Add a friend</span>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Username…"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
          />
          <button className="btn btn-primary shrink-0" onClick={sendRequest} disabled={!usernameInput.trim() || busy === "send"}>
            Send request
          </button>
        </div>
        {err && <p className="text-xs text-[var(--bad)]">{err}</p>}
        {msg && <p className="text-xs text-[var(--good)]">{msg}</p>}
      </section>

      {data && data.incoming.length > 0 && (
        <section className="mb-6">
          <span className="label mb-2 block">Incoming requests</span>
          <div className="panel divide-y divide-[var(--border)] overflow-hidden">
            {data.incoming.map((r) => (
              <div key={r.friendshipId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[var(--accent-contrast)]">
                  {displayName(r.user)[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{displayName(r.user)}</span>
                <button
                  className="btn btn-primary !p-2"
                  aria-label="Accept"
                  onClick={() => accept(r.friendshipId)}
                  disabled={busy === r.friendshipId}
                >
                  <IconCheck width={15} height={15} />
                </button>
                <button
                  className="btn btn-ghost !p-2 !text-[var(--bad)]"
                  aria-label="Decline"
                  onClick={() => decline(r.friendshipId)}
                  disabled={busy === r.friendshipId}
                >
                  <IconClose width={15} height={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {data && data.outgoing.length > 0 && (
        <section className="mb-6">
          <span className="label mb-2 block">Outgoing requests</span>
          <div className="panel divide-y divide-[var(--border)] overflow-hidden">
            {data.outgoing.map((r) => (
              <div key={r.friendshipId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elev-2)] text-sm font-black">
                  {displayName(r.user)[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{displayName(r.user)}</span>
                <span className="text-xs text-[var(--text-faint)]">Pending</span>
                <button
                  className="btn btn-ghost !p-2 !text-[var(--bad)]"
                  aria-label="Cancel request"
                  onClick={() => remove(r.friendshipId)}
                  disabled={busy === r.friendshipId}
                >
                  <IconClose width={15} height={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <span className="label mb-2 block">
          Friends {data ? `(${data.friends.length})` : ""}
        </span>
        {data && data.friends.length === 0 ? (
          <div className="panel flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-[var(--text-muted)]">No friends yet. Send a request above to get started.</p>
          </div>
        ) : (
          <div className="panel divide-y divide-[var(--border)] overflow-hidden">
            {data?.friends.map((f) => {
              const isOnline = onlineIds.has(f.user.id);
              const pickerOpen = challengeUserId === f.user.id;
              return (
                <div key={f.friendshipId} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[var(--accent-contrast)]">
                      {displayName(f.user)[0]?.toUpperCase()}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--panel)]"
                        style={{ background: isOnline ? "var(--good)" : "var(--text-faint)" }}
                        aria-label={isOnline ? "Online" : "Offline"}
                        title={isOnline ? "Online" : "Offline"}
                      />
                    </span>
                    {f.user.username ? (
                      <Link href={`/u/${f.user.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-[var(--accent)]">
                        {displayName(f.user)}
                      </Link>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{displayName(f.user)}</span>
                    )}
                    <button
                      className="btn btn-ghost !py-1.5 !text-xs"
                      disabled={!isOnline || !!outgoing}
                      title={isOnline ? "Challenge to a game" : "Only online friends can be challenged right now"}
                      onClick={() => setChallengeUserId(pickerOpen ? null : f.user.id)}
                    >
                      Challenge
                    </button>
                    <button
                      className="btn btn-ghost !p-2 !text-[var(--bad)]"
                      aria-label="Remove friend"
                      onClick={() => remove(f.friendshipId)}
                      disabled={busy === f.friendshipId}
                    >
                      <IconClose width={15} height={15} />
                    </button>
                  </div>
                  {pickerOpen && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--bg-elev)] p-2.5">
                      <select
                        className="input !w-auto !py-1 text-xs"
                        value={challengeTc.id}
                        onChange={(e) => {
                          const t = timedControls.find((tt) => tt.id === e.target.value);
                          if (t) setChallengeTc(t);
                        }}
                      >
                        {timedControls.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <input
                          type="checkbox"
                          checked={challengeRated}
                          onChange={(e) => setChallengeRated(e.target.checked)}
                          className="h-3.5 w-3.5 accent-[var(--accent)]"
                        />
                        Rated
                      </label>
                      <button
                        className="btn btn-primary !py-1 !text-xs"
                        onClick={() => sendChallenge(f.user.id, displayName(f.user))}
                      >
                        Send challenge
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
