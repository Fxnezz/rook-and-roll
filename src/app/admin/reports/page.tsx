"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ReportRow {
  id: string;
  reason: string;
  detail: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  resolution: string | null;
  createdAt: string;
  reporter: { username: string | null } | null;
  reported: { id: string; username: string | null; status: string };
}

const STATUS_OPTIONS = ["OPEN", "RESOLVED", "DISMISSED", "ALL"] as const;

export default function AdminReportsPage() {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("OPEN");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (s: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?status=${s}`);
    const data = await res.json();
    setReports(data.reports ?? []);
    setOpenCount(data.openCount ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const act = async (id: string, action: "resolve" | "dismiss") => {
    let resolution: string | null = null;
    if (action === "resolve") {
      resolution = prompt("Resolution note (optional):", "") ?? "";
    }
    setBusy(id);
    await fetch(`/api/admin/reports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, resolution }),
    }).catch(() => {});
    setBusy(null);
    load(status);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold">
            Reports {openCount > 0 && <span className="chip !bg-[var(--bad)] !text-white ml-1">{openCount} open</span>}
          </h1>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="rounded border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: "var(--border-strong)",
              background: status === s ? "var(--accent)" : "transparent",
              color: status === s ? "var(--accent-contrast)" : "var(--text-muted)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-faint)]">No reports.</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="border-b border-[var(--border)] px-3 py-3 text-sm last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/u/${r.reported.username}`} className="font-semibold hover:underline">
                      {r.reported.username ?? "—"}
                    </Link>
                    <span className="chip !px-1.5 !py-0.5 text-[10px]">{r.reported.status}</span>
                  </div>
                  <p className="mt-1">{r.reason}</p>
                  {r.detail && <p className="mt-1 text-xs text-[var(--text-muted)]">{r.detail}</p>}
                  {r.resolution && (
                    <p className="mt-1 text-xs text-[var(--good)]">Resolution: {r.resolution}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-faint)]">
                    reported by {r.reporter?.username ?? "anonymous"} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                {r.status === "OPEN" && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r.id, "resolve")}
                      className="rounded border px-2 py-1 text-xs font-semibold text-[var(--good)]"
                      style={{ borderColor: "var(--border-strong)" }}
                    >
                      Resolve
                    </button>
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r.id, "dismiss")}
                      className="rounded border px-2 py-1 text-xs font-semibold text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-strong)" }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
