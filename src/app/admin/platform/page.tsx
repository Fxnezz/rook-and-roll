"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Cfg {
  maintenance: boolean;
  broadcast: { id: string; message: string; level: "info" | "warning"; expiresAt: number | null } | null;
}

export default function AdminPlatformPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [msg, setMsg] = useState("");
  const [level, setLevel] = useState<"info" | "warning">("info");
  const [hours, setHours] = useState("");

  const load = () => fetch("/api/admin/config").then((r) => r.json()).then(setCfg);
  useEffect(() => {
    load();
  }, []);

  const post = async (body: object) => {
    await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        ← Admin
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Platform</h1>

      <section className="panel mb-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Maintenance mode</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Non-admins see a “back soon” page. You keep full access.
            </p>
          </div>
          <button
            className={`btn ${cfg?.maintenance ? "btn-danger" : "btn-primary"}`}
            onClick={() => post({ maintenance: !cfg?.maintenance })}
            disabled={!cfg}
          >
            {cfg?.maintenance ? "Turn OFF" : "Turn ON"}
          </button>
        </div>
        {cfg?.maintenance && <p className="mt-3 text-sm font-semibold text-[var(--bad)]">● Maintenance is ON</p>}
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">Site-wide announcement</h2>
        {cfg?.broadcast && (
          <div className="mt-3 flex items-center justify-between rounded bg-[var(--bg-elev)] p-2 text-sm">
            <span>
              Live: “{cfg.broadcast.message}” ({cfg.broadcast.level})
            </span>
            <button className="btn btn-ghost !py-1 text-xs" onClick={() => post({ broadcast: null })}>
              Clear
            </button>
          </div>
        )}
        <textarea
          className="input !font-sans mt-3 min-h-[70px]"
          placeholder="Announcement text…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <select className="input !font-sans w-32" value={level} onChange={(e) => setLevel(e.target.value as "info" | "warning")}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
          </select>
          <input
            className="input !font-sans w-40"
            placeholder="Expires in hours (blank)"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <button
            className="btn btn-primary ml-auto"
            disabled={!msg.trim()}
            onClick={() => {
              post({
                broadcast: {
                  message: msg.trim(),
                  level,
                  expiresAt: hours ? Date.now() + Number(hours) * 3_600_000 : null,
                },
              });
              setMsg("");
            }}
          >
            Publish
          </button>
        </div>
      </section>
    </div>
  );
}
