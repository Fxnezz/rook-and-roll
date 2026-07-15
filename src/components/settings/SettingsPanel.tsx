"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  useSettings,
  type AnimationSpeed,
  type BoardFrame,
  type MoveInputMode,
  type CoordinateStyle,
  type UiTextScale,
  type DefaultGameTab,
  type HighlightStyle,
  type UiFontFamily,
  type MoveAnnounceVerbosity,
} from "@/lib/chess/useSettings";
import { playSound, setSoundPack, setNotifySoundPack, type SoundName, type SoundPack } from "@/lib/chess/sound";
import { BOARD_THEMES } from "@/lib/chess/themes";
import { PIECE_SETS, Piece } from "@/lib/pieces";
import { IconPalette, IconVolume, IconVolumeOff, IconSparkles, IconMotion, IconRefresh, IconCheck, IconShield, IconDownload, IconSearch } from "../ui/icons";

const SOUND_PACKS: { id: SoundPack; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "retro", label: "Retro" },
  { id: "soft", label: "Soft" },
  { id: "wood", label: "Wood" },
];

const SOUND_PREVIEWS: { id: SoundName; label: string }[] = [
  { id: "move", label: "Move" },
  { id: "capture", label: "Capture" },
  { id: "check", label: "Check" },
  { id: "castle", label: "Castle" },
  { id: "promote", label: "Promote" },
  { id: "gameStart", label: "Game start" },
  { id: "gameEnd", label: "Game end" },
  { id: "illegal", label: "Illegal" },
  { id: "notify", label: "Notify" },
  { id: "lowTime", label: "Low time" },
  { id: "opponentConnected", label: "Opponent joined" },
  { id: "opponentDisconnected", label: "Opponent left" },
  { id: "chatMessage", label: "Chat message" },
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

const COORDINATE_STYLES: { id: CoordinateStyle; label: string }[] = [
  { id: "inside", label: "Inside" },
  { id: "outside", label: "Outside" },
];

const HIGHLIGHT_STYLES: { id: HighlightStyle; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "pulse", label: "Pulse" },
];

const UI_FONT_FAMILIES: { id: UiFontFamily; label: string }[] = [
  { id: "system", label: "System" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
];

const MOVE_ANNOUNCE_VERBOSITY: { id: MoveAnnounceVerbosity; label: string }[] = [
  { id: "minimal", label: "Minimal" },
  { id: "standard", label: "Standard" },
  { id: "detailed", label: "Detailed" },
];

const TOAST_POSITIONS: { id: "bottom-center" | "top-center" | "bottom-right" | "top-right"; label: string }[] = [
  { id: "bottom-center", label: "Bottom" },
  { id: "top-center", label: "Top" },
  { id: "bottom-right", label: "Bottom-right" },
  { id: "top-right", label: "Top-right" },
];

const UI_TEXT_SCALES: { id: UiTextScale; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "normal", label: "Normal" },
  { id: "large", label: "Large" },
];

const DEFAULT_GAME_TABS: { id: DefaultGameTab; label: string }[] = [
  { id: "moves", label: "Moves" },
  { id: "analysis", label: "Analysis" },
  { id: "share", label: "Share" },
];

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

export function SettingsPanel({ canModerate = false }: { canModerate?: boolean } = {}) {
  const { settings, update, reset } = useSettings();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [settingsQuery, setSettingsQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const q = settingsQuery.trim().toLowerCase();
    Object.values(sectionRefs.current).forEach((el) => {
      if (!el) return;
      el.style.display = !q || (el.textContent ?? "").toLowerCase().includes(q) ? "" : "none";
    });
  }, [settingsQuery]);

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rook-and-roll-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportErr(null);
    file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("bad");
        update(parsed);
      })
      .catch(() => setImportErr("That file isn't a valid settings export."));
  };

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
      <div className="relative">
        <IconSearch width={14} height={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
        <input
          className="input !pl-8 text-xs"
          placeholder="Search settings…"
          value={settingsQuery}
          onChange={(e) => setSettingsQuery(e.target.value)}
        />
      </div>
      <div ref={(el) => { sectionRefs.current.appearance = el; }}>
      <Section icon={<IconPalette width={14} height={14} />} title="Appearance" i={0}>
        <Toggle
          label="Confetti celebrations"
          description="Show confetti on arcade wins and other celebratory moments"
          checked={settings.confettiEnabled}
          onChange={(v) => update({ confettiEnabled: v })}
        />
        <Toggle
          label="Compact UI"
          description="Tighter padding and spacing across panels, for fitting more on screen"
          checked={settings.compactUi}
          onChange={(v) => update({ compactUi: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Toast position</span>
        <Segmented options={TOAST_POSITIONS} value={settings.toastPosition} onChange={(v) => update({ toastPosition: v })} />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Board theme</span>
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

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Coordinate placement</span>
        <Segmented options={COORDINATE_STYLES} value={settings.coordinateStyle} onChange={(v) => update({ coordinateStyle: v })} />

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

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Last-move highlight</span>
        <Segmented options={HIGHLIGHT_STYLES} value={settings.highlightStyle} onChange={(v) => update({ highlightStyle: v })} />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Coordinate label color</span>
        <div className="flex items-center gap-2">
          <button
            aria-label="Coordinate color: theme default"
            onClick={() => update({ coordinateColor: null })}
            className="hover-lift flex h-7 items-center rounded-full border border-[var(--border)] px-2 text-xs transition-transform"
            style={{
              boxShadow: !settings.coordinateColor ? "0 0 0 2px var(--panel), 0 0 0 4px var(--accent)" : "none",
            }}
          >
            Auto
          </button>
          <input
            type="color"
            value={settings.coordinateColor ?? "#000000"}
            onChange={(e) => update({ coordinateColor: e.target.value })}
            className="h-7 w-7 cursor-pointer rounded-full border border-[var(--border)] bg-transparent p-0"
            aria-label="Custom coordinate label color"
          />
        </div>
      </Section>
      </div>

      <div ref={(el) => { sectionRefs.current.sound = el; }}>
      <div className="h-px bg-[var(--border)]" />

      <Section icon={settings.soundEnabled ? <IconVolume width={14} height={14} /> : <IconVolumeOff width={14} height={14} />} title="Sound" i={1}>
        <Toggle label="Sound effects" checked={settings.soundEnabled} onChange={(v) => update({ soundEnabled: v })} />
        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: settings.soundEnabled ? 90 : 0, opacity: settings.soundEnabled ? 1 : 0 }}
        >
          <span className="mb-1 mt-2 block text-xs text-[var(--text-faint)]">Move volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
          <span className="mb-1 mt-2 block text-xs text-[var(--text-faint)]">UI / chat volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.uiVolume}
            onChange={(e) => update({ uiVolume: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <span className="mb-2 mt-3 block text-xs font-semibold text-[var(--text-muted)]">Sound pack</span>
        <Segmented
          options={SOUND_PACKS}
          value={settings.soundPack}
          onChange={(v) => {
            setSoundPack(v);
            update({ soundPack: v });
            playSound("move");
          }}
        />

        <Toggle
          label="Sound on opponent's move"
          description="Play a sound when the opponent moves, not just you"
          checked={settings.opponentMoveSound}
          onChange={(v) => update({ opponentMoveSound: v })}
        />
        <Toggle
          label="Chat message sound"
          description="Play a sound when a new chat message arrives"
          checked={settings.chatSound}
          onChange={(v) => update({ chatSound: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Notification sound</span>
        <Segmented
          options={SOUND_PACKS}
          value={settings.notifySoundPack}
          onChange={(v) => {
            setNotifySoundPack(v);
            update({ notifySoundPack: v });
            playSound("notify");
          }}
        />

        <Toggle
          label="Desktop notifications"
          description="Show an OS-level notification when a new alert arrives while this tab is in the background"
          checked={settings.desktopNotifications}
          onChange={(v) => {
            update({ desktopNotifications: v });
            if (v && typeof Notification !== "undefined" && Notification.permission === "default") {
              Notification.requestPermission();
            }
          }}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Preview sounds</span>
        <div className="flex flex-wrap gap-1.5">
          {SOUND_PREVIEWS.map((s) => (
            <button
              key={s.id}
              className="hover-lift rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              onClick={() => playSound(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>
      </div>

      <div ref={(el) => { sectionRefs.current.gameplay = el; }}>
      <div className="h-px bg-[var(--border)]" />

      <Section icon={<IconSparkles width={14} height={14} />} title="Gameplay" i={2}>
        <Toggle
          label="Bot banter"
          description="Show a short speech-bubble line from the bot on captures, checks, and checkmates"
          checked={settings.botBanter}
          onChange={(v) => update({ botBanter: v })}
        />
        <Toggle
          label="Adaptive bot difficulty"
          description="Nudge bot skill up or down a notch on rematch, based on your recent win/loss streak against it"
          checked={settings.adaptiveBotDifficulty}
          onChange={(v) => update({ adaptiveBotDifficulty: v })}
        />
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
        <Toggle
          label="Captured pieces tray"
          description="Show the pieces each side has captured"
          checked={settings.showCapturedTray}
          onChange={(v) => update({ showCapturedTray: v })}
        />
        <Toggle
          label="Haptic feedback"
          description="Brief vibration on move/capture/check (supported devices only)"
          checked={settings.hapticFeedback}
          onChange={(v) => update({ hapticFeedback: v })}
        />
        <Toggle
          label="Request analysis automatically"
          description="Automatically analyze the game when it ends, instead of requiring a manual click"
          checked={settings.autoAnalyze}
          onChange={(v) => update({ autoAnalyze: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Analysis depth</span>
        <Segmented
          options={[
            { id: "8", label: "Quick" },
            { id: "12", label: "Standard" },
            { id: "16", label: "Deep" },
          ]}
          value={String(settings.analysisDepth) as "8" | "12" | "16"}
          onChange={(v) => update({ analysisDepth: Number(v) as 8 | 12 | 16 })}
        />
        <Toggle
          label="Blindfold mode (bot games)"
          description="Hide all pieces while playing bots — classic visualization training. Moves still work normally."
          checked={settings.blindfoldBot}
          onChange={(v) => update({ blindfoldBot: v })}
        />
        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Hint strength</span>
        <Segmented
          options={[
            { id: "best", label: "Best move" },
            { id: "second-best", label: "Lighter nudge" },
          ]}
          value={settings.hintMode}
          onChange={(v) => update({ hintMode: v as "best" | "second-best" })}
        />
        <Toggle
          label="Unlimited takebacks (bot / pass & play)"
          description="Skip the takeback cap in games with no real opponent to be unfair to. Online games always enforce the server-side limit."
          checked={settings.unlimitedTakebacks}
          onChange={(v) => update({ unlimitedTakebacks: v })}
        />
        <Toggle
          label="Practice mode (arcade & mini-games)"
          description="Scores from Snake, Tetris, and every other mini-game won't be recorded as a personal best or submitted to leaderboards while this is on."
          checked={settings.arcadePracticeMode}
          onChange={(v) => update({ arcadePracticeMode: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Low-time warning threshold</span>
        <Slider
          value={settings.lowTimeThresholdSec}
          min={5}
          max={60}
          step={1}
          suffix="s"
          onChange={(v) => update({ lowTimeThresholdSec: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Move input</span>
        <Segmented
          options={MOVE_INPUT_MODES}
          value={settings.moveInputMode}
          onChange={(v) => update({ moveInputMode: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Default tab on game pages</span>
        <Segmented
          options={DEFAULT_GAME_TABS}
          value={settings.defaultGameTab}
          onChange={(v) => update({ defaultGameTab: v })}
        />
      </Section>
      </div>

      <div ref={(el) => { sectionRefs.current.accessibility = el; }}>
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
        <Toggle
          label="Announce moves via speech"
          description="Reads each move aloud using your browser's text-to-speech"
          checked={settings.speechAnnounceMoves}
          onChange={(v) => update({ speechAnnounceMoves: v })}
        />
        <Toggle
          label="Figurine notation"
          description="Show piece glyphs (♘ ♗ ♖) instead of letters in move lists"
          checked={settings.figurineNotation}
          onChange={(v) => update({ figurineNotation: v })}
        />
        <Toggle
          label="Dyslexia-friendly font"
          description="Swap body text to a more accessible typeface"
          checked={settings.dyslexiaFont}
          onChange={(v) => update({ dyslexiaFont: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">UI text size</span>
        <Segmented options={UI_TEXT_SCALES} value={settings.uiTextScale} onChange={(v) => update({ uiTextScale: v })} />

        <Toggle
          label="Flash on sound"
          description="Briefly flash the screen edge on move/capture/check — a visual pairing for sound cues"
          checked={settings.flashOnSound}
          onChange={(v) => update({ flashOnSound: v })}
        />
        <Toggle
          label="Muted-sound indicator"
          description="Show a small red dot on the header mute button when sound is off"
          checked={settings.soundMutedIndicator}
          onChange={(v) => update({ soundMutedIndicator: v })}
        />
        <Toggle
          label="Infinite scroll"
          description="Auto-load more items when you scroll near the bottom of a list, instead of clicking Load more"
          checked={settings.infiniteScrollLists}
          onChange={(v) => update({ infiniteScrollLists: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">UI font</span>
        <Segmented options={UI_FONT_FAMILIES} value={settings.uiFontFamily} onChange={(v) => update({ uiFontFamily: v })} />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Line height</span>
        <Slider value={settings.uiLineHeight} min={1.2} max={2} step={0.1} onChange={(v) => update({ uiLineHeight: v })} />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Move announcement detail</span>
        <Segmented options={MOVE_ANNOUNCE_VERBOSITY} value={settings.moveAnnounceVerbosity} onChange={(v) => update({ moveAnnounceVerbosity: v })} />

        <Toggle
          label="Reduce transparency"
          description="Replace blurred/translucent panels with solid backgrounds"
          checked={settings.reduceTransparency}
          onChange={(v) => update({ reduceTransparency: v })}
        />
        <Toggle
          label="Underline links"
          description="Always underline inline links, not just on hover"
          checked={settings.underlineLinks}
          onChange={(v) => update({ underlineLinks: v })}
        />
        <Toggle
          label="Larger touch targets"
          description="Increases the minimum size of buttons and inputs"
          checked={settings.largeTouchTargets}
          onChange={(v) => update({ largeTouchTargets: v })}
        />
        <Toggle
          label="Reduce blinking indicators"
          description="Stops in-app blinking indicators (e.g. the bot-thinking dots) from animating"
          checked={settings.reducedCaretBlink}
          onChange={(v) => update({ reducedCaretBlink: v })}
        />

        <span className="mb-2 mt-4 block text-xs font-semibold text-[var(--text-muted)]">Focus outline color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={settings.focusOutlineColor}
            onChange={(e) => update({ focusOutlineColor: e.target.value })}
            className="h-7 w-7 cursor-pointer rounded-full border border-[var(--border)] bg-transparent p-0"
            aria-label="Custom focus outline color"
          />
        </div>
      </Section>
      </div>

      {canModerate && (
        <div ref={(el) => { sectionRefs.current.moderation = el; }}>
          <div className="h-px bg-[var(--border)]" />
          <Section icon={<IconShield width={14} height={14} />} title="Moderation" i={4}>
            <Toggle
              label="Flagged-message sound"
              description="Play a distinct sound when a flagged chat message arrives"
              checked={settings.modFlaggedSound}
              onChange={(v) => update({ modFlaggedSound: v })}
            />
            <Toggle
              label="Hide moderation UI"
              description="Fully hide the badge, shield icon, and panel — act like a normal player"
              checked={settings.modHideUI}
              onChange={(v) => update({ modHideUI: v })}
            />
          </Section>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button className="btn hover-lift flex-1 !justify-start gap-2 !text-sm" onClick={exportSettings}>
            <IconDownload width={15} height={15} />
            Export settings
          </button>
          <label className="btn hover-lift flex-1 !justify-start gap-2 !text-sm cursor-pointer">
            <IconDownload width={15} height={15} style={{ transform: "rotate(180deg)" }} />
            Import settings
            <input type="file" accept="application/json" className="hidden" onChange={importSettings} />
          </label>
        </div>
        {importErr && <p className="text-xs text-[var(--bad)]">{importErr}</p>}
      </div>

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
