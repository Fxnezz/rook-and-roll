"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Admin {
  id: string;
  username: string | null;
  email: string;
  isOwner: boolean;
}

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/admins");
    const data = await res.json();
    setAdmins(data.admins ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const email = newEmail.trim();
    if (!email) return;
    setBusy(email);
    setError("");
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "Could not add admin.");
    else setNewEmail("");
    setBusy(null);
    load();
  };

  const remove = async (admin: Admin) => {
    if (admin.isOwner) return;
    if (!confirm(`Remove admin access for ${admin.username ?? admin.email}?`)) return;
    setBusy(admin.id);
    await fetch(`/api/admin/admins/${admin.id}`, { method: "DELETE" }).catch(() => {});
    setBusy(null);
    load();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        ← Admin
      </Link>
      <h1 className="mb-4 text-2xl font-bold">Manage admins</h1>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Grants or revokes access to this entire /admin dashboard. Independent of in-game moderator status.
      </p>

      <div className="panel mb-4 flex flex-wrap gap-2 p-3">
        <input
          className="input !font-sans flex-1 basis-52"
          placeholder="Email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <button className="btn" disabled={!newEmail.trim() || busy === newEmail.trim()} onClick={add}>
          Add admin
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-[var(--bad)]">{error}</p>}

      <div className="panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">No admins yet.</p>
        ) : (
          admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 text-sm last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold">
                  {a.username ?? "—"}
                  {a.isOwner && <span className="chip !px-1.5 !py-0.5 text-[10px]">owner</span>}
                </div>
                <div className="truncate text-xs text-[var(--text-faint)]">{a.email}</div>
              </div>
              {!a.isOwner && (
                <button
                  disabled={busy === a.id}
                  onClick={() => remove(a)}
                  className="shrink-0 rounded border px-2 py-1 text-xs font-semibold text-[var(--bad)]"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
