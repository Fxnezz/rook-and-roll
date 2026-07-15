"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { ACHIEVEMENTS } from "@/lib/achievements/catalog";

interface Me {
  username: string | null;
  hasPassword: boolean;
  notifyFriendRequests: boolean;
  notifyFriendOnline: boolean;
  showOnlineStatus: boolean;
  notifyAchievements: boolean;
  notifyGameResults: boolean;
  doNotDisturb: boolean;
  autoDeclineFriendRequests: boolean;
  profilePublic: boolean;
  bio: string | null;
  bannerColor: string | null;
  pinnedAchievementId: string | null;
  earnedAchievementIds: string[];
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
          <ProfileEditForm initial={me} />
          <PreferencesForm initial={me} />
          <DataAndSessionsForm />
          <DangerZone requiresPassword={me.hasPassword} />
        </div>
      )}
    </div>
  );
}

interface LoginEventRow {
  id: string;
  ip: string | null;
  userAgent: string | null;
  method: string;
  createdAt: string;
}

function DataAndSessionsForm() {
  const [signingOut, setSigningOut] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<LoginEventRow[] | null>(null);

  const loadHistory = () => {
    setShowHistory((v) => !v);
    if (history) return;
    fetch("/api/me/login-history")
      .then((r) => r.json())
      .then((d) => setHistory(d.events ?? []))
      .catch(() => setHistory([]));
  };

  const signOutEverywhere = async () => {
    setErr(null);
    setSigningOut(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signOutAllDevices" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErr(data.error ?? "Something went wrong.");
        return;
      }
      await afterChange();
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="panel flex flex-col gap-3 p-5">
      <h2 className="font-bold">Data &amp; sessions</h2>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm">Download my data</p>
          <p className="text-xs text-[var(--text-muted)]">A JSON export of your profile, games, ratings, and achievements.</p>
        </div>
        <a href="/api/me/export" download className="btn hover-lift !py-1.5 !text-sm">
          Download
        </a>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm">Sign out of all other devices</p>
          <p className="text-xs text-[var(--text-muted)]">Ends every other signed-in session, including this one.</p>
        </div>
        <button className="btn hover-lift !py-1.5 !text-sm" onClick={signOutEverywhere} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out everywhere"}
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm">Login history</p>
          <p className="text-xs text-[var(--text-muted)]">Recent sign-ins to your account.</p>
        </div>
        <button className="btn btn-ghost hover-lift !py-1.5 !text-sm" onClick={loadHistory}>
          {showHistory ? "Hide" : "View"}
        </button>
      </div>
      {showHistory && (
        <div className="max-h-56 overflow-y-auto rounded-md bg-[var(--bg-elev)] p-2">
          {history === null ? (
            <p className="p-2 text-sm text-[var(--text-muted)]">Loading…</p>
          ) : history.length === 0 ? (
            <p className="p-2 text-sm text-[var(--text-muted)]">No recorded logins yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                  <span className="capitalize text-[var(--text-muted)]">{h.method}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text-faint)]">{h.ip ?? "unknown IP"}</span>
                  <span className="shrink-0 text-[var(--text-faint)]">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {err && <p className="text-sm text-[var(--bad)]">{err}</p>}
    </div>
  );
}

function DangerZone({ requiresPassword }: { requiresPassword: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const deleteAccount = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete account.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel flex flex-col gap-3 border-[var(--bad)]/40 p-5">
      <h2 className="font-bold text-[var(--bad)]">Delete account</h2>
      {!confirming ? (
        <>
          <p className="text-sm text-[var(--text-muted)]">
            Permanently deletes your account, profile, and settings. Your past games stay in the historical record but are no
            longer linked to you.
          </p>
          <button className="btn hover-lift !py-2 !text-[var(--bad)]" onClick={() => setConfirming(true)}>
            Delete my account
          </button>
        </>
      ) : (
        <>
          {requiresPassword && (
            <div>
              <label className="label mb-1 block">Current password</label>
              <input
                className="input !font-sans"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          )}
          {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
          <div className="flex gap-2">
            <button className="btn hover-lift !py-2 !border-[var(--bad)] !text-[var(--bad)]" onClick={deleteAccount} disabled={loading}>
              {loading ? "Deleting…" : "Confirm permanent deletion"}
            </button>
            <button className="btn hover-lift !py-2" onClick={() => setConfirming(false)} disabled={loading}>
              Cancel
            </button>
          </div>
        </>
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

const BANNER_SWATCHES = ["#5b8dee", "#e5604d", "#5bbf7a", "#e5a13c", "#a85bd8", "#3ba0a0"];

function ProfileEditForm({ initial }: { initial: Pick<Me, "bio" | "bannerColor" | "pinnedAchievementId" | "earnedAchievementIds"> }) {
  const [bio, setBio] = useState(initial.bio ?? "");
  const [bannerColor, setBannerColor] = useState<string | null>(initial.bannerColor);
  const [pinnedAchievementId, setPinnedAchievementId] = useState(initial.pinnedAchievementId ?? "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const earned = ACHIEVEMENTS.filter((a) => initial.earnedAchievementIds.includes(a.id));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setLoading(true);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", bio, bannerColor, pinnedAchievementId: pinnedAchievementId || null }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={save} className="panel flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Profile</h2>
        {saved && <span className="text-xs text-[var(--good)]">Saved</span>}
      </div>
      <div>
        <label className="label mb-1 block">Bio</label>
        <textarea
          className="input !font-sans"
          rows={3}
          maxLength={280}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short line about you…"
        />
        <p className="mt-1 text-right text-xs text-[var(--text-faint)]">{bio.length}/280</p>
      </div>
      <div>
        <label className="label mb-1 block">Profile banner color</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="No banner color"
            onClick={() => setBannerColor(null)}
            className="hover-lift flex h-7 items-center rounded-full border border-[var(--border)] px-2 text-xs transition-transform"
            style={{ boxShadow: !bannerColor ? "0 0 0 2px var(--panel), 0 0 0 4px var(--accent)" : "none" }}
          >
            None
          </button>
          {BANNER_SWATCHES.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`Banner color ${c}`}
              onClick={() => setBannerColor(c)}
              className="hover-lift h-7 w-7 rounded-full transition-transform"
              style={{ background: c, boxShadow: bannerColor === c ? "0 0 0 2px var(--panel), 0 0 0 4px var(--accent)" : "none" }}
            />
          ))}
        </div>
      </div>
      {earned.length > 0 && (
        <div>
          <label className="label mb-1 block">Featured achievement</label>
          <select className="input !font-sans" value={pinnedAchievementId} onChange={(e) => setPinnedAchievementId(e.target.value)}>
            <option value="">None</option>
            {earned.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <button className="btn btn-primary !py-2" disabled={loading}>
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

type PrefKey =
  | "notifyFriendRequests"
  | "notifyFriendOnline"
  | "showOnlineStatus"
  | "notifyAchievements"
  | "notifyGameResults"
  | "profilePublic"
  | "doNotDisturb"
  | "autoDeclineFriendRequests";

function PreferencesForm({ initial }: { initial: Pick<Me, PrefKey> }) {
  const [notifyFriendRequests, setNotifyFriendRequests] = useState(initial.notifyFriendRequests);
  const [notifyFriendOnline, setNotifyFriendOnline] = useState(initial.notifyFriendOnline);
  const [showOnlineStatus, setShowOnlineStatus] = useState(initial.showOnlineStatus);
  const [notifyAchievements, setNotifyAchievements] = useState(initial.notifyAchievements);
  const [notifyGameResults, setNotifyGameResults] = useState(initial.notifyGameResults);
  const [profilePublic, setProfilePublic] = useState(initial.profilePublic);
  const [doNotDisturb, setDoNotDisturb] = useState(initial.doNotDisturb);
  const [autoDeclineFriendRequests, setAutoDeclineFriendRequests] = useState(initial.autoDeclineFriendRequests);
  const [saved, setSaved] = useState(false);

  const save = async (patch: Partial<Record<PrefKey, boolean>>) => {
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
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Public profile (visible to everyone, not just friends)</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={profilePublic}
          onChange={(e) => {
            setProfilePublic(e.target.checked);
            save({ profilePublic: e.target.checked });
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Notify me when I earn an achievement</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={notifyAchievements}
          onChange={(e) => {
            setNotifyAchievements(e.target.checked);
            save({ notifyAchievements: e.target.checked });
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Notify me when a rated game finishes</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={notifyGameResults}
          onChange={(e) => {
            setNotifyGameResults(e.target.checked);
            save({ notifyGameResults: e.target.checked });
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Do not disturb (silence the bell badge &amp; sound)</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={doNotDisturb}
          onChange={(e) => {
            setDoNotDisturb(e.target.checked);
            save({ doNotDisturb: e.target.checked });
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Auto-decline incoming friend requests</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={autoDeclineFriendRequests}
          onChange={(e) => {
            setAutoDeclineFriendRequests(e.target.checked);
            save({ autoDeclineFriendRequests: e.target.checked });
          }}
        />
      </label>
    </div>
  );
}
