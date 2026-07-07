"use client";

import { useState, type ReactNode } from "react";
import { useSettings, type AnimationSpeed, type BoardFrame, type MoveInputMode } from "@/lib/chess/useSettings";
import type { SoundPack } from "@/lib/chess/sound";
import { BOARD_THEMES } from "@/lib/chess/themes";
import { PIECE_SETS, Piece } from "@/lib/pieces";
import { IconPalette, IconVolume, IconVolumeOff, IconSparkles, IconMotion, IconRefresh, IconCheck } from "../ui/icons";

const SOUND_PACKS: { id: SoundPack; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "retro", label: "Retro" },
  { id: "soft", label: "Soft" },
  { id: "wood", label: "Wood" },
];

const ANIM_SPEEDS: { id: AnimationSpeed; label: string }[] = [
  { id: "instant", label: "Off" },
  { id: "fast", label: "Fast" },
  { id: "normal", label: "Normal" },
  { id: "slow", label: "Slow" },
];

const BOARD_FRAMES: { id: BoardFrame; label: string }[] = [
  { id: "none", label: "None" },
  { id: "minimal", label: "Minimal" },
  { id: "wood", label: "Wood" },
  { id: "shadow", label: "Shadow" },
];

const MOVE_INPUT_MODES: { id: MoveInputMode; label: string }[] = [
  { id: "both", label: "Both" },
  { id: "drag", label: "Drag" },
  { id: "click", label: "Click" },
];

const ARROW_SWATCHES = ["#f2b544", "#e5604d", "#5aa8e0", "#5bbf7a", "#c98bd8"];

function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="hover-lift rounded-md border px-1.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              borderColor: active ? "var(--accent)" : "var(--border)",
              background: active ? "var(--bg-elev-2)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Slider({ value, min, max, step = 1, onChange, suffix = "%" }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-[var(--text-faint)]">
        {value}
        {suffix}
      </span>
    </div>
  );
}

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
        <button
          className="btn hover-lift mt-2 !justify-start gap-2 !py-1.5 !text-xs"
          onClick={() => {
            const others = BOARD_THEMES.filter((t) => t.id !== settings.boardTheme);
            const pick = others[Math.floor(Math.random() * others.length)] ?? BOARD_THEMES[0];
            update({ boardTheme: pick.id });
          }}
        >
          <IconRefresh width={13} height={13} /> Random theme
        </button>

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

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Board size</span>
        <Slider value={settings.boardZoom} min={80} max={140} step={5} onChange={(v) => update({ boardZoom: v })} />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Piece size</span>
        <Slider value={settings.pieceSize} min={70} max={115} step={5} onChange={(v) => update({ pieceSize: v })} />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Move animation speed</span>
        <Segmented options={ANIM_SPEEDS} value={settings.animationSpeed} onChange={(v) => update({ animationSpeed: v })} />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Board frame</span>
        <Segmented options={BOARD_FRAMES} value={settings.boardFrame} onChange={(v) => update({ boardFrame: v })} />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Arrow color</span>
        <div className="flex items-center gap-2">
          {ARROW_SWATCHES.map((c) => (
            <button
              key={c}
              aria-label={`Arrow color ${c}`}
              onClick={() => update({ arrowColor: c })}
              className="hover-lift h-7 w-7 rounded-full transition-transform"
              style={{
                background: c,
                boxShadow: settings.arrowColor === c ? "0 0 0 2px var(--panel), 0 0 0 4px var(--accent)" : "none",
              }}
            />
          ))}
          <input
            type="color"
            value={settings.arrowColor}
            onChange={(e) => update({ arrowColor: e.target.value })}
            className="h-7 w-7 cursor-pointer rounded-full border border-[var(--border)] bg-transparent p-0"
            aria-label="Custom arrow color"
          />
        </div>

        <div className="mt-2">
          <Toggle
            label="Custom square colors"
            checked={!!settings.squareColorOverride}
            onChange={(v) => update({ squareColorOverride: v ? { light: "#ebecd0", dark: "#6f8f5a" } : null })}
          />
        </div>
        {settings.squareColorOverride && (
          <div className="mt-2 flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
              Light
              <input
                type="color"
                value={settings.squareColorOverride.light}
                onChange={(e) => update({ squareColorOverride: { ...settings.squareColorOverride!, light: e.target.value } })}
                className="h-7 w-7 cursor-pointer rounded-md border border-[var(--border)] bg-transparent p-0"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
              Dark
              <input
                type="color"
                value={settings.squareColorOverride.dark}
                onChange={(e) => update({ squareColorOverride: { ...settings.squareColorOverride!, dark: e.target.value } })}
                className="h-7 w-7 cursor-pointer rounded-md border border-[var(--border)] bg-transparent p-0"
              />
            </label>
          </div>
        )}
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

        <span className="mb-2 mt-3 block text-xs font-semibold text-[var(--text-muted)]">Sound pack</span>
        <Segmented options={SOUND_PACKS} value={settings.soundPack} onChange={(v) => update({ soundPack: v })} />

        <Toggle
          label="Sound on opponent's move"
          description="Play a sound when the opponent moves, not just you"
          checked={settings.opponentMoveSound}
          onChange={(v) => update({ opponentMoveSound: v })}
        />
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
        <Toggle
          label="Premoves"
          description="Queue a move while waiting for your opponent"
          checked={settings.premovesEnabled}
          onChange={(v) => update({ premovesEnabled: v })}
        />
        <Toggle
          label="Confirm moves"
          description="Require a second click on the destination square"
          checked={settings.confirmMove}
          onChange={(v) => update({ confirmMove: v })}
        />
        <Toggle
          label="Auto-queen"
          description="Skip the promotion picker, always promote to queen"
          checked={settings.autoQueen}
          onChange={(v) => update({ autoQueen: v })}
        />
        <Toggle
          label="Compact move list"
          description="Tighter rows so more moves fit on screen"
          checked={settings.compactMoveList}
          onChange={(v) => update({ compactMoveList: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Move input</span>
        <Segmented
          options={MOVE_INPUT_MODES}
          value={settings.moveInputMode}
          onChange={(v) => update({ moveInputMode: v })}
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
        <Toggle
          label="High contrast"
          description="Brighter borders and text for easier scanning"
          checked={settings.highContrast}
          onChange={(v) => update({ highContrast: v })}
        />
        <Toggle
          label="Colorblind-friendly check highlight"
          description="Uses blue instead of red to flag a king in check"
          checked={settings.colorblindMode}
          onChange={(v) => update({ colorblindMode: v })}
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
