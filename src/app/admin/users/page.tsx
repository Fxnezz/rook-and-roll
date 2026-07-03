"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Row {
  id: string;
  username: string | null;
  email: string;
  status: string;
  createdAt: string;
  ratingBlitz: number;
  ratingRapid: number;
  bannedUntil: string | null;
  mutedUntil: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "var(--good)",
  MUTED: "var(--warn)",
  SUSPENDED: "var(--warn)",
  BANNED: "var(--bad)",
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setRows(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  const act = async (id: string, url: string, body: object) => {
    setBusy(id);
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    setBusy(null);
    load(q);
  };

  const ban = (r: Row) => {
    const reason = prompt(`Ban ${r.username}? Reason:`);
    if (reason === null) return;
    const hrs = prompt("Duration in hours (blank = permanent):", "");
    act(r.id, `/api/admin/users/${r.id}/moderate`, {
      action: "ban",
      reason,
      durationHours: hrs ? Number(hrs) : undefined,
    });
  };
  const mute = (r: Row) => {
    const hrs = prompt(`Mute ${r.username} for how many hours? (blank = 24)`, "24");
    if (hrs === null) return;
    act(r.id, `/api/admin/users/${r.id}/moderate`, { action: "mute", durationHours: hrs ? Number(hrs) : 24 });
  };
  const editRating = (r: Row) => {
    const category = prompt("Category (bullet/blitz/rapid/classical):", "blitz");
    if (!category) return;
    const rating = prompt(`New ${category} rating:`, "1200");
    if (!rating) return;
    act(r.id, `/api/admin/users/${r.id}/rating`, { category, rating: Number(rating) });
  };
  const message = (r: Row) => {
    const title = prompt(`Message ${r.username} — subject:`, "Message from the team");
    if (title === null) return;
    const body = prompt("Body:");
    if (!body) return;
    act(r.id, `/api/admin/users/${r.id}/notify`, { title, message: body });
  };
  const impersonate = async (r: Row) => {
    if (!confirm(`Impersonate ${r.username}? You'll browse as them (banner shown).`)) return;
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: r.id }),
    });
    if (res.ok) window.location.href = "/";
    else alert("Could not impersonate.");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold">Users</h1>
        </div>
      </div>

      <input
        className="input !font-sans mb-4"
        placeholder="Search username or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-faint)]">
          <span>User</span>
          <span>Status</span>
          <span>Blitz</span>
          <span className="text-right">Actions</span>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">No users.</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-sm last:border-0"
            >
              <button className="min-w-0 text-left" onClick={() => setDetailId(r.id)}>
                <div className="truncate font-semibold">{r.username ?? "—"}</div>
                <div className="truncate text-xs text-[var(--text-faint)]">{r.email}</div>
              </button>
              <span className="text-xs font-bold" style={{ color: STATUS_COLOR[r.status] ?? "var(--text)" }}>
                {r.status}
              </span>
              <span className="font-mono text-xs">{r.ratingBlitz}</span>
              <div className="flex flex-wrap justify-end gap-1">
                <MiniBtn onClick={() => setDetailId(r.id)}>View</MiniBtn>
                <MiniBtn onClick={() => impersonate(r)}>Login&nbsp;as</MiniBtn>
                <MiniBtn onClick={() => message(r)}>DM</MiniBtn>
                <MiniBtn onClick={() => editRating(r)}>Rating</MiniBtn>
                {r.status === "MUTED" ? (
                  <MiniBtn onClick={() => act(r.id, `/api/admin/users/${r.id}/moderate`, { action: "unmute" })}>
                    Unmute
                  </MiniBtn>
                ) : (
                  <MiniBtn onClick={() => mute(r)}>Mute</MiniBtn>
                )}
                {r.status === "BANNED" || r.status === "SUSPENDED" ? (
                  <MiniBtn danger onClick={() => act(r.id, `/api/admin/users/${r.id}/moderate`, { action: "unban" })}>
                    Unban
                  </MiniBtn>
                ) : (
                  <MiniBtn danger onClick={() => ban(r)}>
                    Ban
                  </MiniBtn>
                )}
                {busy === r.id && <span className="text-xs text-[var(--text-faint)]">…</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {detailId && <UserDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function MiniBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded border px-2 py-1 text-xs font-semibold transition-colors"
      style={{
        borderColor: "var(--border-strong)",
        color: danger ? "var(--bad)" : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  );
}

interface Detail {
  id: string;
  username: string | null;
  email: string;
  createdAt: string;
  status: string;
  moderationReason: string | null;
  bannedUntil: string | null;
  ratingBullet: number;
  ratingBlitz: number;
  ratingRapid: number;
  ratingClassical: number;
  accounts: { provider: string; type: string }[];
  loginEvents: { ip: string | null; method: string; createdAt: string; userAgent: string | null }[];
  _count: { gamesAsWhite: number; gamesAsBlack: number };
}

function UserDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((x) => setD(x.user));
  }, [id]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 animate-fade" onClick={onClose}>
      <div className="panel max-h-[85vh] w-full max-w-lg overflow-y-auto p-5 animate-pop" onClick={(e) => e.stopPropagation()}>
        {!d ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{d.username}</h2>
                <p className="text-sm text-[var(--text-muted)]">{d.email}</p>
              </div>
              <span className="chip">{d.status}</span>
            </div>
            {d.moderationReason && (
              <p className="mb-3 rounded bg-[var(--bad)]/10 p-2 text-sm text-[var(--bad)]">
                {d.moderationReason}
              </p>
            )}
            <div className="mb-3 grid grid-cols-4 gap-2 text-center">
              {(["ratingBullet", "ratingBlitz", "ratingRapid", "ratingClassical"] as const).map((k) => (
                <div key={k} className="rounded bg-[var(--bg-elev)] p-2">
                  <div className="font-bold">{d[k]}</div>
                  <div className="label">{k.replace("rating", "")}</div>
                </div>
              ))}
            </div>
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Joined {new Date(d.createdAt).toLocaleDateString()} ·{" "}
              {d._count.gamesAsWhite + d._count.gamesAsBlack} games ·{" "}
              {d.accounts.length ? `OAuth: ${d.accounts.map((a) => a.provider).join(", ")}` : "no OAuth"}
            </p>
            <span className="label">Recent logins (IP)</span>
            <div className="mt-1 max-h-40 overflow-y-auto rounded bg-[var(--bg)] p-2 font-mono text-xs">
              {d.loginEvents.length === 0 ? (
                <span className="text-[var(--text-faint)]">none recorded</span>
              ) : (
                d.loginEvents.map((e, i) => (
                  <div key={i} className="truncate">
                    {new Date(e.createdAt).toLocaleString()} · {e.ip ?? "—"} · {e.method}
                  </div>
                ))
              )}
            </div>
            <button className="btn mt-4 w-full" onClick={onClose}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
