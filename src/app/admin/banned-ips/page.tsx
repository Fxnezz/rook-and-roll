"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface BannedIp {
  ip: string;
  reason: string | null;
  createdAt: string;
}

export default function AdminBannedIpsPage() {
  const [ips, setIps] = useState<BannedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/banned-ips");
    const data = await res.json();
    setIps(data.ips ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const ip = newIp.trim();
    if (!ip) return;
    setBusy(ip);
    await fetch("/api/admin/banned-ips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", ip, reason: newReason.trim() || undefined }),
    }).catch(() => {});
    setNewIp("");
    setNewReason("");
    setBusy(null);
    load();
  };

  const remove = async (ip: string) => {
    if (!confirm(`Unban ${ip}?`)) return;
    setBusy(ip);
    await fetch("/api/admin/banned-ips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", ip }),
    }).catch(() => {});
    setBusy(null);
    load();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        ← Admin
      </Link>
      <h1 className="mb-4 text-2xl font-bold">Banned IPs</h1>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Blocks sign-in and registration from an IP. Applies to email/password login only, not Google sign-in.
      </p>

      <div className="panel mb-4 flex flex-wrap gap-2 p-3">
        <input
          className="input !font-sans flex-1 basis-40"
          placeholder="IP address"
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
        />
        <input
          className="input !font-sans flex-1 basis-40"
          placeholder="Reason (optional)"
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
        />
        <button className="btn" disabled={!newIp.trim() || busy === newIp.trim()} onClick={add}>
          Ban
        </button>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">Loading…</p>
        ) : ips.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">No banned IPs.</p>
        ) : (
          ips.map((row) => (
            <div
              key={row.ip}
              className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 text-sm last:border-0"
            >
              <div className="min-w-0">
                <div className="font-mono font-semibold">{row.ip}</div>
                <div className="truncate text-xs text-[var(--text-faint)]">
                  {row.reason ?? "no reason given"} · {new Date(row.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                disabled={busy === row.ip}
                onClick={() => remove(row.ip)}
                className="shrink-0 rounded border px-2 py-1 text-xs font-semibold text-[var(--bad)]"
                style={{ borderColor: "var(--border-strong)" }}
              >
                Unban
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
