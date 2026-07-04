"use client";

import { useEffect, useState } from "react";
import { TIME_CONTROLS } from "@/lib/chess/useClock";
import type { LiveMatchConfig } from "@/lib/admin/liveConfig";

export function LiveMatchSettings() {
  const [cfg, setCfg] = useState<LiveMatchConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/admin/live-config").then((r) => r.json()).then((d) => setCfg(d.config));
  useEffect(() => {
    load();
  }, []);

  const patch = async (p: Partial<LiveMatchConfig>) => {
    setSaving(true);
    const res = await fetch("/api/admin/live-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const data = await res.json();
    setCfg(data.config);
    setSaving(false);
  };

  if (!cfg) return <p className="p-6 text-center text-sm text-[var(--text-faint)]">Loading…</p>;

  const toggleTimeControl = (id: string) => {
    const enabled = cfg.enabledTimeControls ?? TIME_CONTROLS.map((t) => t.id);
    const next = enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id];
    patch({ enabledTimeControls: next.length === TIME_CONTROLS.length ? null : next });
  };

  return (
    <div className="space-y-4">
      <Section title="Access">
        <Toggle label="Allow spectators" checked={cfg.allowSpectators} onChange={(v) => patch({ allowSpectators: v })} />
        <Toggle label="Allow in-game chat" checked={cfg.allowChat} onChange={(v) => patch({ allowChat: v })} />
        <Toggle label="Allow guest play" checked={cfg.allowGuestPlay} onChange={(v) => patch({ allowGuestPlay: v })} />
      </Section>

      <Section title="Time controls">
        <div className="flex flex-wrap gap-2">
          {TIME_CONTROLS.map((tc) => {
            const enabled = cfg.enabledTimeControls == null || cfg.enabledTimeControls.includes(tc.id);
            return (
              <button
                key={tc.id}
                onClick={() => toggleTimeControl(tc.id)}
                className="rounded border px-2 py-1 text-xs font-semibold"
                style={{
                  borderColor: "var(--border-strong)",
                  background: enabled ? "var(--accent)" : "transparent",
                  color: enabled ? "var(--accent-contrast)" : "var(--text-faint)",
                }}
              >
                {tc.name}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Connection & abandonment">
        <NumberField
          label="Disconnect grace period (seconds)"
          value={cfg.disconnectGraceSec}
          onCommit={(v) => patch({ disconnectGraceSec: v })}
        />
      </Section>

      <Section title="Matchmaking rating band">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Start ±" value={cfg.matchmaking.startBand} onCommit={(v) => patch({ matchmaking: { ...cfg.matchmaking, startBand: v } })} />
          <NumberField
            label="Widen by"
            value={cfg.matchmaking.widenAmount}
            onCommit={(v) => patch({ matchmaking: { ...cfg.matchmaking, widenAmount: v } })}
          />
          <NumberField
            label="Every (sec)"
            value={cfg.matchmaking.widenIntervalSec}
            onCommit={(v) => patch({ matchmaking: { ...cfg.matchmaking, widenIntervalSec: v } })}
          />
        </div>
        <NumberField label="Max band" value={cfg.matchmaking.maxBand} onCommit={(v) => patch({ matchmaking: { ...cfg.matchmaking, maxBand: v } })} />
      </Section>

      <Section title="Elo K-factor multiplier (1.0 = default)">
        <div className="grid grid-cols-4 gap-2">
          {(["bullet", "blitz", "rapid", "classical"] as const).map((cat) => (
            <NumberField
              key={cat}
              label={cat}
              step={0.1}
              value={cfg.kFactorMultiplier[cat]}
              onCommit={(v) => patch({ kFactorMultiplier: { ...cfg.kFactorMultiplier, [cat]: v } })}
            />
          ))}
        </div>
      </Section>

      <Section title="Reports & warnings">
        <NumberField label="Max reports/hour per user" value={cfg.reportsMaxPerHour} onCommit={(v) => patch({ reportsMaxPerHour: v })} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Auto-warn after N reports"
            value={cfg.autoWarn.reportThreshold}
            onCommit={(v) => patch({ autoWarn: { ...cfg.autoWarn, reportThreshold: v } })}
          />
          <NumberField
            label="…within N days"
            value={cfg.autoWarn.windowDays}
            onCommit={(v) => patch({ autoWarn: { ...cfg.autoWarn, windowDays: v } })}
          />
        </div>
      </Section>

      <Section title="Anti-cheat">
        <Toggle
          label="Enabled (move-timing correlation)"
          checked={cfg.anticheat.enabled}
          onChange={(v) => patch({ anticheat: { ...cfg.anticheat, enabled: v } })}
        />
        <NumberField
          label="Suspicion threshold (0–1)"
          step={0.05}
          value={cfg.anticheat.suspicionThreshold}
          onCommit={(v) => patch({ anticheat: { ...cfg.anticheat, suspicionThreshold: v } })}
        />
        <p className="text-xs text-[var(--text-faint)]">
          Games above the threshold auto-file into the Reports queue for review — no automatic action is taken against the player.
        </p>
      </Section>

      <Section title="Spectator broadcast delay">
        <NumberField
          label="Delay (seconds, 0 = live)"
          value={cfg.spectatorBroadcastDelaySec}
          onCommit={(v) => patch({ spectatorBroadcastDelaySec: v })}
        />
        <p className="text-xs text-[var(--text-faint)]">Players always see moves instantly — this only delays the feed shown to spectators.</p>
      </Section>

      <Section title="Admin behavior">
        <Toggle
          label="Announce when a moderator attaches to a game"
          checked={cfg.notifyPlayersOnAdminAttach}
          onChange={(v) => patch({ notifyPlayersOnAdminAttach: v })}
        />
        <Toggle label="Log every live-game admin action to the audit log" checked={cfg.logAdminSocketActions} onChange={(v) => patch({ logAdminSocketActions: v })} />
      </Section>

      <Section title="Admin note">
        <textarea
          className="input !font-sans min-h-[60px] w-full"
          placeholder="Pinned note shown only on this page (e.g. accounts under review)…"
          defaultValue={cfg.liveNotice ?? ""}
          onBlur={(e) => patch({ liveNotice: e.target.value.trim() || null })}
        />
      </Section>

      {saving && <p className="text-xs text-[var(--text-faint)]">Saving…</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="label mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded border px-2 py-1.5 text-sm"
      style={{ borderColor: "var(--border-strong)" }}
    >
      <span>{label}</span>
      <span className="font-bold" style={{ color: checked ? "var(--good)" : "var(--text-faint)" }}>
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  onCommit,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-[var(--text-faint)]">{label}</span>
      <input
        className="input !font-sans w-full"
        type="number"
        step={step}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Number(local);
          if (!Number.isNaN(n)) onCommit(n);
          else setLocal(String(value));
        }}
      />
    </label>
  );
}
