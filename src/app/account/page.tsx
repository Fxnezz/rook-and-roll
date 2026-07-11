"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";

interface Me {
  username: string | null;
  hasPassword: boolean;
  notifyFriendRequests: boolean;
  notifyFriendOnline: boolean;
  showOnlineStatus: boolean;
}

export default function AccountPage() {
  const { status } = useSession();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => {});
  }, [status]);

  if (status === "unauthenticated") redirect("/login");

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Account</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Manage your username and password.</p>
      {status === "loading" || !me ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <UsernameForm currentUsername={me.username} requiresPassword={me.hasPassword} />
          {me.hasPassword ? (
            <PasswordForm />
          ) : (
            <div className="panel p-5">
              <h2 className="font-bold">Password</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                This account signs in with Google — there&apos;s no password to change.
              </p>
            </div>
          )}
          <PreferencesForm initial={me} />
        </div>
      )}
    </div>
  );
}

/** Any successful change invalidates this session's JWT-carried claims, so sign the user out and have them sign back in. */
async function afterChange() {
  await signOut({ callbackUrl: "/login" });
}

function UsernameForm({ currentUsername, requiresPassword }: { currentUsername: string | null; requiresPassword: boolean }) {
  const [newUsername, setNewUsername] = useState(currentUsername ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "username", newUsername, currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update username.");
        return;
      }
      if (newUsername !== currentUsername) await afterChange();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-3 p-5">
      <h2 className="font-bold">Username</h2>
      <div>
        <label className="label mb-1 block">New username</label>
        <input
          className="input !font-sans"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="3–20 letters, numbers, _"
          required
        />
      </div>
      {requiresPassword && (
        <div>
          <label className="label mb-1 block">Current password</label>
          <input
            className="input !font-sans"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
      )}
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button className="btn btn-primary !py-2" disabled={loading}>
        {loading ? "Saving…" : "Save username"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }
      await afterChange();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-3 p-5">
      <h2 className="font-bold">Password</h2>
      <div>
        <label className="label mb-1 block">Current password</label>
        <input
          className="input !font-sans"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label mb-1 block">New password</label>
        <input
          className="input !font-sans"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label mb-1 block">Confirm new password</label>
        <input
          className="input !font-sans"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button className="btn btn-primary !py-2" disabled={loading}>
        {loading ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

function PreferencesForm({
  initial,
}: {
  initial: Pick<Me, "notifyFriendRequests" | "notifyFriendOnline" | "showOnlineStatus">;
}) {
  const [notifyFriendRequests, setNotifyFriendRequests] = useState(initial.notifyFriendRequests);
  const [notifyFriendOnline, setNotifyFriendOnline] = useState(initial.notifyFriendOnline);
  const [showOnlineStatus, setShowOnlineStatus] = useState(initial.showOnlineStatus);
  const [saved, setSaved] = useState(false);

  const save = async (patch: Partial<Record<"notifyFriendRequests" | "notifyFriendOnline" | "showOnlineStatus", boolean>>) => {
    setSaved(false);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preferences", ...patch }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      /* best-effort */
    }
  };

  return (
    <div className="panel flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Notifications &amp; privacy</h2>
        {saved && <span className="text-xs text-[var(--good)]">Saved</span>}
      </div>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Notify me about friend requests</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={notifyFriendRequests}
          onChange={(e) => {
            setNotifyFriendRequests(e.target.checked);
            save({ notifyFriendRequests: e.target.checked });
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Notify me when a friend comes online</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={notifyFriendOnline}
          onChange={(e) => {
            setNotifyFriendOnline(e.target.checked);
            save({ notifyFriendOnline: e.target.checked });
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Show my online status to others</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={showOnlineStatus}
          onChange={(e) => {
            setShowOnlineStatus(e.target.checked);
            save({ showOnlineStatus: e.target.checked });
          }}
        />
      </label>
    </div>
  );
}
