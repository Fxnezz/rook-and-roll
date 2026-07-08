"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { IconUsers, IconCheck, IconClose } from "@/components/ui/icons";

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
  const { status } = useSession();
  const [data, setData] = useState<FriendsData | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-bold">
        <IconUsers width={22} height={22} /> Friends
      </h1>

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
            {data?.friends.map((f) => (
              <div key={f.friendshipId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[var(--accent-contrast)]">
                  {displayName(f.user)[0]?.toUpperCase()}
                </span>
                {f.user.username ? (
                  <Link href={`/u/${f.user.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-[var(--accent)]">
                    {displayName(f.user)}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{displayName(f.user)}</span>
                )}
                <button
                  className="btn btn-ghost !p-2 !text-[var(--bad)]"
                  aria-label="Remove friend"
                  onClick={() => remove(f.friendshipId)}
                  disabled={busy === f.friendshipId}
                >
                  <IconClose width={15} height={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
