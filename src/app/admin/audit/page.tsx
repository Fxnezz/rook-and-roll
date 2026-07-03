"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Entry {
  id: string;
  actor: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  detail: unknown;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (a: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/audit?action=${encodeURIComponent(a)}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(action), 250);
    return () => clearTimeout(t);
  }, [action, load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        ← Admin
      </Link>
      <h1 className="mb-4 text-2xl font-bold">Audit log</h1>

      <input
        className="input !font-sans mb-4"
        placeholder="Filter by action (e.g. user_ban, impersonate)…"
        value={action}
        onChange={(e) => setAction(e.target.value)}
      />

      <div className="panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">No entries.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="border-b border-[var(--border)] px-3 py-2 text-sm last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--accent)]">{e.action}</span>
                {e.targetType && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {e.targetType}:{e.targetId?.slice(0, 10)}
                  </span>
                )}
                <span className="ml-auto text-xs text-[var(--text-faint)]">
                  {e.ip ?? "—"} · {new Date(e.createdAt).toLocaleString()}
                </span>
              </div>
              {e.detail != null && Object.keys(e.detail as object).length > 0 && (
                <pre className="mt-1 overflow-x-auto rounded bg-[var(--bg)] p-1.5 text-[10px] text-[var(--text-muted)]">
                  {JSON.stringify(e.detail)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
