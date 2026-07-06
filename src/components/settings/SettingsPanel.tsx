"use client";

import { useState, type ReactNode } from "react";
import { useSettings } from "@/lib/chess/useSettings";
import { BOARD_THEMES } from "@/lib/chess/themes";
import { PIECE_SETS, Piece } from "@/lib/pieces";
import { IconPalette, IconVolume, IconVolumeOff, IconSparkles, IconMotion, IconRefresh, IconCheck } from "../ui/icons";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button className="hover-lift flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2.5 text-left" onClick={() => onChange(!checked)}>
      <span>
        <span className="block text-sm text-[var(--text)]">{label}</span>
        {description && <span className="block text-xs text-[var(--text-faint)]">{description}</span>}
      </span>
      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200"
        style={{ background: checked ? "var(--accent)" : "var(--border-strong)" }}
      >
        <span
          className="absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white transition-transform duration-200"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)", transitionTimingFunction: "var(--ease-spring)" }}
        >
          <span className="transition-opacity duration-150" style={{ opacity: checked ? 1 : 0 }}>
            <IconCheck width={12} height={12} stroke="var(--accent-dim)" strokeWidth={3} />
          </span>
        </span>
      </span>
    </button>
  );
}

function Section({ icon, title, i, children }: { icon: ReactNode; title: string; i: number; children: ReactNode }) {
  return (
    <section className="stagger-item" style={{ "--i": i } as React.CSSProperties}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--bg-elev)] text-[var(--accent)]">{icon}</span>
        <span className="label">{title}</span>
      </div>
      {children}
    </section>
  );
}

export function SettingsPanel() {
  const { settings, update, reset } = useSettings();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleReset = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      setTimeout(() => setConfirmingReset(false), 3000);
      return;
    }
    reset();
    setConfirmingReset(false);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <Section icon={<IconPalette width={14} height={14} />} title="Appearance" i={0}>
        <span className="mb-2 mt-3 block text-xs font-semibold text-[var(--text-muted)]">Board theme</span>
        <div className="grid grid-cols-2 gap-2">
          {BOARD_THEMES.map((t) => {
            const active = settings.boardTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => update({ boardTheme: t.id })}
                className="hover-lift flex items-center gap-2 rounded-lg border p-2 transition-colors"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--bg-elev-2)" : "transparent",
                }}
              >
                <span className="grid h-8 w-8 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded">
                  <span style={{ background: t.light }} />
                  <span style={{ background: t.dark }} />
                  <span style={{ background: t.dark }} />
                  <span style={{ background: t.light }} />
                </span>
                <span className="text-sm">{t.name}</span>
              </button>
            );
          })}
        </div>

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Piece set</span>
        <div className="grid grid-cols-2 gap-2">
          {PIECE_SETS.map((s) => {
            const active = settings.pieceSet === s.id;
            return (
              <button
                key={s.id}
                onClick={() => update({ pieceSet: s.id })}
                className="hover-lift flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--bg-elev-2)" : "transparent",
                }}
              >
                <span className="flex items-center">
                  <span style={{ width: 30, height: 30 }}>
                    <Piece type="n" color="w" set={s.id} size={30} />
                  </span>
                  <span style={{ width: 30, height: 30 }}>
                    <Piece type="q" color="b" set={s.id} size={30} />
                  </span>
                </span>
                <span className="text-sm">{s.name}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="h-px bg-[var(--border)]" />

      <Section icon={settings.soundEnabled ? <IconVolume width={14} height={14} /> : <IconVolumeOff width={14} height={14} />} title="Sound" i={1}>
        <Toggle label="Sound effects" checked={settings.soundEnabled} onChange={(v) => update({ soundEnabled: v })} />
        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: settings.soundEnabled ? 40 : 0, opacity: settings.soundEnabled ? 1 : 0 }}
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      </Section>

      <div className="h-px bg-[var(--border)]" />

      <Section icon={<IconSparkles width={14} height={14} />} title="Gameplay" i={2}>
        <Toggle label="Show coordinates" checked={settings.showCoordinates} onChange={(v) => update({ showCoordinates: v })} />
        <Toggle label="Show legal moves" checked={settings.showLegalMoves} onChange={(v) => update({ showLegalMoves: v })} />
        <Toggle label="Highlight last move" checked={settings.highlightLastMove} onChange={(v) => update({ highlightLastMove: v })} />
        <Toggle label="Animate pieces" checked={settings.animate} onChange={(v) => update({ animate: v })} />
        <Toggle
          label="Auto-flip each turn"
          description="Pass & play only"
          checked={settings.autoFlip}
          onChange={(v) => update({ autoFlip: v })}
        />
      </Section>

      <div className="h-px bg-[var(--border)]" />

      <Section icon={<IconMotion width={14} height={14} />} title="Accessibility" i={3}>
        <Toggle
          label="Reduce motion"
          description="Minimizes transitions and animations across the site"
          checked={settings.reduceMotion}
          onChange={(v) => update({ reduceMotion: v })}
        />
      </Section>

      <button
        className={`btn hover-lift !justify-start gap-2 !text-sm ${confirmingReset ? "!border-[var(--bad)] !text-[var(--bad)]" : ""}`}
        onClick={handleReset}
      >
        <IconRefresh width={15} height={15} />
        {confirmingReset ? "Click again to confirm" : "Reset to defaults"}
      </button>
    </div>
  );
}
