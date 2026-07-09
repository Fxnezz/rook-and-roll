"use client";

import { useState } from "react";

type FriendState = "none" | "outgoing" | "incoming" | "friends";

export function FriendButton({
  username,
  initialState,
  initialFriendshipId,
}: {
  username: string;
  initialState: FriendState;
  initialFriendshipId: string | null;
}) {
  const [state, setState] = useState<FriendState>(initialState);
  const [friendshipId, setFriendshipId] = useState(initialFriendshipId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sendRequest = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send request.");
        return;
      }
      setFriendshipId(data.friendship.id);
      setState(data.friendship.status === "ACCEPTED" ? "friends" : "outgoing");
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!friendshipId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/friends/${friendshipId}/accept`, { method: "POST" });
      if (res.ok) setState("friends");
      else setError("Could not accept request.");
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!friendshipId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/friends/${friendshipId}/decline`, { method: "POST" });
      if (res.ok) {
        setState("none");
        setFriendshipId(null);
      } else {
        setError("Could not decline request.");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!friendshipId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (res.ok) {
        setState("none");
        setFriendshipId(null);
      } else {
        setError("Could not remove.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {state === "none" && (
        <button className="btn !py-1.5 text-xs" disabled={busy} onClick={sendRequest}>
          Add friend
        </button>
      )}
      {state === "outgoing" && (
        <button className="btn-ghost text-xs text-[var(--text-faint)]" disabled={busy} onClick={remove}>
          Request sent · Cancel
        </button>
      )}
      {state === "incoming" && (
        <div className="flex gap-1.5">
          <button className="btn !py-1.5 text-xs" disabled={busy} onClick={accept}>
            Accept request
          </button>
          <button className="btn-ghost text-xs text-[var(--text-faint)]" disabled={busy} onClick={decline}>
            Decline
          </button>
        </div>
      )}
      {state === "friends" && (
        <button className="btn-ghost text-xs text-[var(--text-faint)]" disabled={busy} onClick={remove}>
          ✓ Friends · Remove
        </button>
      )}
      {error && <p className="text-xs text-[var(--bad)]">{error}</p>}
    </div>
  );
}
