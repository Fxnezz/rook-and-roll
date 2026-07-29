"use client";

import { useState, type ReactNode } from "react";
import {
  useSettings,
  type AnimationSpeed,
  type BoardFrame,
  type MoveInputMode,
  type CoordinateStyle,
  type UiTextScale,
  type DefaultGameTab,
  type MotionProfile,
  type PageTransition,
  type HoverMotion,
  type CelebrationIntensity,
  type AmbientScene,
  type ArcadeQuality,
} from "@/lib/chess/useSettings";
import { playSound, setSoundPack, type SoundName, type SoundPack } from "@/lib/chess/sound";
import { BOARD_THEMES } from "@/lib/chess/themes";
import { PIECE_SETS, Piece } from "@/lib/pieces";
import { WebsiteControls } from "@/components/qol/WebsiteEnhancements";
import { QOL_STATIC_ROUTES } from "@/lib/qol/routes";
import { useQol } from "@/lib/qol/useQol";
import type { SettingsTab } from "@/lib/settings/openSettings";
import { IconPalette, IconVolume, IconVolumeOff, IconSparkles, IconMotion, IconRefresh, IconCheck, IconShield, IconDownload } from "../ui/icons";

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

const ARCADE_QUALITIES: { id: ArcadeQuality; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "ultra", label: "Ultra" },
  { id: "smooth", label: "Smooth" },
  { id: "calm", label: "Calm" },
];

const SETTINGS_TABS: { id: SettingsTab; label: string; symbol: string; description: string }[] = [
  { id: "motion", label: "Motion Studio", symbol: "✦", description: "Profiles, transitions and effects" },
  { id: "qol", label: "QOL & Website", symbol: "◇", description: "Comfort, navigation and website tools" },
  { id: "board", label: "Board & style", symbol: "♞", description: "Themes, pieces and layout" },
  { id: "sound", label: "Sound", symbol: "♫", description: "Mix, packs and previews" },
  { id: "gameplay", label: "Gameplay", symbol: "♟", description: "Moves, analysis and controls" },
  { id: "accessibility", label: "Accessibility", symbol: "◉", description: "Motion, contrast and reading" },
  { id: "moderation", label: "Moderation", symbol: "◆", description: "Owner-only alerts and controls" },
  { id: "data", label: "Settings data", symbol: "⇄", description: "Export, import and reset" },
];

const SEARCH_ITEMS: { label: string; tab: SettingsTab; keywords: string }[] = [
  { label: "Minimal performance mode", tab: "motion", keywords: "simple clean lightweight fast flat low power effects performance minimalistic" },
  { label: "Motion profiles and presets", tab: "motion", keywords: "animation cinematic arcade calm balanced" },
  { label: "Page transitions", tab: "motion", keywords: "fade slide zoom curtain navigation" },
  { label: "Hover movement and panel glow", tab: "motion", keywords: "button hover glow effects depth blur tilt cursor spotlight" },
  { label: "Ambient scenes", tab: "motion", keywords: "aurora chess stars particles background environment" },
  { label: "Scroll reveals", tab: "motion", keywords: "entrance viewport reveal cards sections" },
  { label: "Celebration intensity", tab: "motion", keywords: "confetti win celebration effects" },
  { label: "Arcade graphics and performance", tab: "motion", keywords: "game quality fps adaptive ultra smooth calm cinematic hud" },
  { label: "Website and Page Guide tools", tab: "qol", keywords: "breadcrumbs notes reading ruler low data battery session clock outline share health contrast cursor drafts print haptics" },
  { label: "Interface density", tab: "qol", keywords: "compact comfortable spacious layout" },
  { label: "Keyboard shortcuts", tab: "qol", keywords: "keys command alt navigation" },
  { label: "Daily play target", tab: "qol", keywords: "goal games progress" },
  { label: "Sidebar destinations", tab: "qol", keywords: "menu hidden navigation routes" },
  { label: "Board theme and piece set", tab: "board", keywords: "appearance chess pieces colors" },
  { label: "Board size, frame and coordinates", tab: "board", keywords: "zoom frame arrow square coordinate" },
  { label: "Sound effects and volume", tab: "sound", keywords: "audio music volume pack chat" },
  { label: "Move controls and premoves", tab: "gameplay", keywords: "drag click confirm queen legal moves" },
  { label: "Analysis and hints", tab: "gameplay", keywords: "engine depth hint review bot blindfold" },
  { label: "Reduced motion and contrast", tab: "accessibility", keywords: "accessible animation high contrast colorblind" },
  { label: "Speech, notation and text size", tab: "accessibility", keywords: "dyslexia read font announce" },
  { label: "Import, export or reset settings", tab: "data", keywords: "backup restore defaults json" },
];

const MOTION_PROFILES: {
  id: Exclude<MotionProfile, "custom">;
  label: string;
  description: string;
  accent: string;
  settings: {
    pageTransition: PageTransition;
    hoverMotion: HoverMotion;
    ambientMotion: boolean;
    panelGlow: boolean;
    buttonEffects: boolean;
    staggerMenus: boolean;
    celebrationIntensity: CelebrationIntensity;
    depthBlur: boolean;
    animationSpeed: AnimationSpeed;
    ambientScene: AmbientScene;
    cursorGlow: boolean;
    scrollReveal: boolean;
    cardTilt: boolean;
  };
}[] = [
  {
    id: "calm",
    label: "Calm",
    description: "Quick, quiet movement with no ambient distractions.",
    accent: "#78a8c8",
    settings: { pageTransition: "fade", hoverMotion: "off", ambientMotion: false, panelGlow: false, buttonEffects: false, staggerMenus: false, celebrationIntensity: "off", depthBlur: false, animationSpeed: "fast", ambientScene: "aurora", cursorGlow: false, scrollReveal: false, cardTilt: false },
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Polished motion that stays fast and easy to follow.",
    accent: "#e9a23b",
    settings: { pageTransition: "fade", hoverMotion: "subtle", ambientMotion: true, panelGlow: true, buttonEffects: true, staggerMenus: true, celebrationIntensity: "subtle", depthBlur: false, animationSpeed: "normal", ambientScene: "aurora", cursorGlow: true, scrollReveal: true, cardTilt: true },
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Smooth depth, slower transitions and dramatic entrances.",
    accent: "#9f8bea",
    settings: { pageTransition: "curtain", hoverMotion: "subtle", ambientMotion: true, panelGlow: true, buttonEffects: true, staggerMenus: true, celebrationIntensity: "full", depthBlur: true, animationSpeed: "slow", ambientScene: "stars", cursorGlow: true, scrollReveal: true, cardTilt: true },
  },
  {
    id: "arcade",
    label: "Arcade",
    description: "Expressive lifts, energetic highlights and full celebrations.",
    accent: "#5bbf7a",
    settings: { pageTransition: "zoom", hoverMotion: "expressive", ambientMotion: true, panelGlow: true, buttonEffects: true, staggerMenus: true, celebrationIntensity: "full", depthBlur: false, animationSpeed: "fast", ambientScene: "chess", cursorGlow: true, scrollReveal: true, cardTilt: true },
  },
];

function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
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
    <button type="button" aria-pressed={checked} className="hover-lift flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2.5 text-left" onClick={() => onChange(!checked)}>
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

function Section({ icon, title, i, children, visible = true, description }: { icon: ReactNode; title: string; i: number; children: ReactNode; visible?: boolean; description?: string }) {
  if (!visible) return null;
  return (
    <section className="settings-surface stagger-item rounded-2xl border border-[var(--border)] bg-[var(--bg)]/45 p-4 sm:p-5" style={{ "--i": i } as React.CSSProperties}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elev)] text-[var(--accent)]">{icon}</span>
        <span>
          <span className="block text-base font-black tracking-tight text-[var(--text)]">{title}</span>
          {description && <span className="mt-0.5 block text-xs text-[var(--text-faint)]">{description}</span>}
        </span>
      </div>
      {children}
    </section>
  );
}

export function SettingsPanel({ canModerate = false, initialTab = "motion" }: { canModerate?: boolean; initialTab?: SettingsTab } = {}) {
  const { settings, update, reset } = useSettings();
  const {
    state: qol,
    setDailyTarget,
    setDensity,
    setInterfaceFocus,
    setNavHidden,
    restoreNavigation,
    setShortcutsEnabled,
    dismissOnboarding,
    importState: importQolState,
    resetState: resetQolState,
  } = useQol();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingQolReset, setConfirmingQolReset] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [qolImportErr, setQolImportErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [search, setSearch] = useState("");
  const availableTabs = SETTINGS_TABS.filter((tab) => tab.id !== "moderation" || canModerate);
  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = normalizedSearch
    ? SEARCH_ITEMS.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(normalizedSearch))
    : [];

  const updateMotion = (patch: Parameters<typeof update>[0]) => {
    update({ ...patch, motionProfile: "custom" });
  };

  const applyMotionProfile = (profile: (typeof MOTION_PROFILES)[number]) => {
    update({ motionProfile: profile.id, reduceMotion: false, ...profile.settings });
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sams-arcade-settings.json";
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

  const exportQolData = () => {
    const blob = new Blob([JSON.stringify(qol, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sams-arcade-qol.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importQolData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setQolImportErr(null);
    file.text()
      .then((text) => {
        if (!importQolState(JSON.parse(text))) throw new Error("invalid");
      })
      .catch(() => setQolImportErr("That file isn't a valid QOL backup."));
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
    <div className="p-3 sm:p-5">
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-elev-2),var(--panel)_58%,color-mix(in_srgb,var(--accent)_12%,var(--panel)))] p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.13em] text-[var(--accent)]">
              <IconSparkles width={12} height={12} /> Personalized control center
            </span>
            <h3 className="text-xl font-black tracking-tight sm:text-2xl">Make the arcade feel like yours.</h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
              Tune movement, chess controls, sound and accessibility. Every change is saved instantly on this device.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/55 px-3 py-2">
              <span className="block text-base font-black text-[var(--accent)]">{availableTabs.length}</span><span className="text-[0.62rem] text-[var(--text-faint)]">Categories</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/55 px-3 py-2">
              <span className="block text-base font-black text-[var(--good)]">Live</span><span className="text-[0.62rem] text-[var(--text-faint)]">Preview</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/55 px-3 py-2">
              <span className="block text-base font-black capitalize text-[var(--info)]">{settings.minimalMode ? "Minimal" : settings.motionProfile}</span><span className="text-[0.62rem] text-[var(--text-faint)]">Interface</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-pressed={settings.minimalMode}
          onClick={() => update({ minimalMode: !settings.minimalMode })}
          className="relative mt-4 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors sm:p-3.5"
          style={{ borderColor: settings.minimalMode ? "var(--good)" : "var(--border)", background: settings.minimalMode ? "color-mix(in srgb, var(--good) 10%, var(--bg))" : "var(--bg)" }}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] text-lg" aria-hidden="true">▤</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-[var(--text)]">Minimal Performance mode</span>
            <span className="mt-0.5 block text-xs leading-5 text-[var(--text-faint)]">Removes ambient effects, heavy blur, decorative motion and the game HUD while keeping every control and result.</span>
          </span>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em]" style={{ color: settings.minimalMode ? "var(--good)" : "var(--text-faint)", background: settings.minimalMode ? "color-mix(in srgb, var(--good) 14%, transparent)" : "var(--bg-elev)" }}>{settings.minimalMode ? "On" : "Off"}</span>
        </button>
        <div className="relative mt-4">
          <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a setting…"
            aria-label="Search settings"
            className="input !rounded-xl !bg-[var(--bg)]/80 !py-2.5 !pl-10 !font-sans"
          />
          {search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-[var(--text-faint)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]">Clear</button>}
        </div>
        {normalizedSearch && (
          <div className="relative mt-2 grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg)]/90 p-2 sm:grid-cols-2">
            {searchResults.length > 0 ? searchResults.map((result) => (
              <button key={result.label} type="button" className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]" onClick={() => { setActiveTab(result.tab); setSearch(""); }}>
                {result.label}<span className="text-[var(--accent)]">Open →</span>
              </button>
            )) : <p className="px-3 py-2 text-xs text-[var(--text-faint)] sm:col-span-2">No matching setting yet. Try “motion”, “sound”, “board” or “text”.</p>}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <nav aria-label="Settings categories" className="grid grid-cols-2 gap-2 self-start sm:grid-cols-4 md:sticky md:top-3 md:grid-cols-1">
          {availableTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setActiveTab(tab.id)}
                className="group flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition"
                style={{ borderColor: active ? "var(--accent)" : "var(--border)", background: active ? "var(--bg-elev-2)" : "var(--bg)", color: active ? "var(--text)" : "var(--text-muted)" }}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--bg-elev)] text-sm text-[var(--accent)] transition-transform group-hover:scale-110">{tab.symbol}</span>
                <span className="min-w-0"><span className="block truncate text-xs font-black sm:text-sm">{tab.label}</span><span className="hidden truncate text-[0.63rem] text-[var(--text-faint)] md:block">{tab.description}</span></span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
      <Section icon={<IconMotion width={17} height={17} />} title="Motion Studio" description="Coordinated animation profiles with a live, reduced-motion-safe preview." i={0} visible={activeTab === "motion"}>
        <div className="mb-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[radial-gradient(circle_at_80%_10%,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_45%),var(--bg-elev)] p-4">
          <div className="grid min-h-44 gap-4 sm:grid-cols-[1fr_12rem] sm:items-center">
            <div>
              <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--accent)]">Live motion engine</span>
              <h4 className="mt-1 text-lg font-black">Depth that reacts to you</h4>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">Tune route choreography, ambient worlds, cursor light, viewport reveals, and perspective response from one studio.</p>
              <button type="button" className="btn btn-primary mt-4">Preview action <span aria-hidden="true">→</span></button>
            </div>
            <div className="relative mx-auto grid h-36 w-44 place-items-center" aria-hidden="true">
              <span className="motion-preview-ring absolute h-24 w-24 rounded-full border border-[var(--accent)]/55" />
              <div className="motion-preview-float settings-surface relative w-36 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-xl">
                <div className="mb-3 flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--bad)]" /><span className="h-2 w-2 rounded-full bg-[var(--warn)]" /><span className="h-2 w-2 rounded-full bg-[var(--good)]" /></div>
                <div className="mb-2 h-2 w-20 rounded-full bg-[var(--accent)]/55" /><div className="mb-1.5 h-1.5 w-full rounded-full bg-[var(--border-strong)]" /><div className="h-1.5 w-3/4 rounded-full bg-[var(--border)]" />
              </div>
            </div>
          </div>
        </div>

        <span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Motion profile</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {MOTION_PROFILES.map((profile) => {
            const active = settings.motionProfile === profile.id;
            return (
              <button key={profile.id} type="button" aria-pressed={active} onClick={() => applyMotionProfile(profile)} className="hover-lift rounded-xl border p-3 text-left" style={{ borderColor: active ? profile.accent : "var(--border)", background: active ? `color-mix(in srgb, ${profile.accent} 9%, var(--bg-elev))` : "var(--bg-elev)" }}>
                <span className="flex items-center justify-between gap-2"><span className="text-sm font-black">{profile.label}</span><span className="h-2.5 w-2.5 rounded-full" style={{ background: profile.accent, boxShadow: active ? `0 0 14px ${profile.accent}` : "none" }} /></span>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--text-faint)]">{profile.description}</span>
              </button>
            );
          })}
        </div>
        {settings.motionProfile === "custom" && <p className="mt-2 rounded-lg border border-[var(--info)]/25 bg-[var(--info)]/10 px-3 py-2 text-xs text-[var(--info)]">Custom profile — you have fine-tuned one or more effects.</p>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Page transition</span><Segmented options={[{ id: "none", label: "None" }, { id: "fade", label: "Fade" }, { id: "slide", label: "Slide" }, { id: "zoom", label: "Zoom" }, { id: "curtain", label: "Curtain" }]} value={settings.pageTransition} onChange={(v) => updateMotion({ pageTransition: v })} /></div>
          <div><span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Hover response</span><Segmented options={[{ id: "off", label: "Off" }, { id: "subtle", label: "Subtle" }, { id: "expressive", label: "Expressive" }]} value={settings.hoverMotion} onChange={(v) => updateMotion({ hoverMotion: v })} /></div>
          <div><span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Animation speed</span><Segmented options={ANIM_SPEEDS} value={settings.animationSpeed} onChange={(v) => updateMotion({ animationSpeed: v })} /></div>
          <div><span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Celebrations</span><Segmented options={[{ id: "off", label: "Off" }, { id: "subtle", label: "Subtle" }, { id: "full", label: "Full" }]} value={settings.celebrationIntensity} onChange={(v) => updateMotion({ celebrationIntensity: v })} /></div>
          <div className="sm:col-span-2"><span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Ambient world</span><Segmented options={[{ id: "aurora", label: "Aurora" }, { id: "chess", label: "Chess grid" }, { id: "stars", label: "Starfield" }]} value={settings.ambientScene} onChange={(v) => updateMotion({ ambientScene: v })} /></div>
        </div>
        <div className="mt-4 grid gap-x-5 sm:grid-cols-2">
          <Toggle label="Ambient motion" description="Slow light and arcade-grid movement behind pages" checked={settings.ambientMotion} onChange={(v) => updateMotion({ ambientMotion: v })} />
          <Toggle label="Panel glow" description="Accent glow on interactive cards and surfaces" checked={settings.panelGlow} onChange={(v) => updateMotion({ panelGlow: v })} />
          <Toggle label="Button effects" description="Shimmer and richer press feedback on primary actions" checked={settings.buttonEffects} onChange={(v) => updateMotion({ buttonEffects: v })} />
          <Toggle label="Staggered menus" description="Items enter in sequence instead of all at once" checked={settings.staggerMenus} onChange={(v) => updateMotion({ staggerMenus: v })} />
          <Toggle label="Cinematic depth blur" description="Soft focus during supported page transitions" checked={settings.depthBlur} onChange={(v) => updateMotion({ depthBlur: v })} />
          <Toggle label="Cursor lighting" description="A soft accent spotlight follows mouse and trackpad movement" checked={settings.cursorGlow} onChange={(v) => updateMotion({ cursorGlow: v })} />
          <Toggle label="Scroll reveals" description="Major cards and sections rise into place as they enter view" checked={settings.scrollReveal} onChange={(v) => updateMotion({ scrollReveal: v })} />
          <Toggle label="Perspective cards" description="Interactive surfaces respond with subtle 3D depth and reflected light" checked={settings.cardTilt} onChange={(v) => updateMotion({ cardTilt: v })} />
          <Toggle label="Reduce all motion" description="Accessibility override: minimize every animation" checked={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--accent)]/25 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent)_9%,var(--bg-elev)),var(--bg))] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--accent)]">Arcade renderer</span>
              <h4 className="mt-1 font-black">Per-game performance studio</h4>
              <p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">Auto measures your device and frame rate, then keeps the richest effects that remain smooth.</p>
            </div>
            <span className="rounded-full border border-[var(--good)]/30 bg-[var(--good)]/10 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider text-[var(--good)]">Live</span>
          </div>
          <div className="mt-4">
            <span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Graphics quality</span>
            <Segmented options={ARCADE_QUALITIES} value={settings.arcadeQuality} onChange={(v) => update({ arcadeQuality: v })} />
          </div>
          <div className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] px-3">
            <Toggle label="Cinematic game worlds" description="Scene lighting, particles, depth and material effects" checked={settings.arcadeCinematic} onChange={(v) => update({ arcadeCinematic: v })} />
            <Toggle label="Performance HUD" description="Show live FPS, graphics, sound and haptic status" checked={settings.arcadePerformanceHud} onChange={(v) => update({ arcadePerformanceHud: v })} />
            <Toggle label="Game haptics" description="Short tactile feedback on supported devices" checked={settings.hapticFeedback} onChange={(v) => update({ hapticFeedback: v })} />
          </div>
        </div>
      </Section>

      <Section icon={<span aria-hidden="true">◇</span>} title="QOL & Website" description="All adjustable quality-of-life controls now live together here." i={1} visible={activeTab === "qol"}>
        <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/8 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Quick comfort presets</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Apply a coordinated set of display, sound and motion choices in one click.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button type="button" className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left hover-lift" onClick={() => { setDensity("spacious"); update({ uiTextScale: "large", reduceMotion: false, highContrast: false, soundEnabled: true }); }}><span className="block text-sm font-extrabold">Comfort</span><span className="mt-1 block text-xs text-[var(--text-faint)]">Larger text and more room.</span></button>
            <button type="button" className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left hover-lift" onClick={() => { setDensity("comfortable"); update({ reduceMotion: true, soundEnabled: false, flashOnSound: false }); }}><span className="block text-sm font-extrabold">Low sensory</span><span className="mt-1 block text-xs text-[var(--text-faint)]">Less motion and silent feedback.</span></button>
            <button type="button" className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left hover-lift" onClick={() => { setDensity("spacious"); update({ highContrast: true, colorblindMode: true, uiTextScale: "large", reduceMotion: true }); }}><span className="block text-sm font-extrabold">High visibility</span><span className="mt-1 block text-xs text-[var(--text-faint)]">Stronger contrast and cues.</span></button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Interface density</span>
            <Segmented options={[{ id: "compact", label: "Compact" }, { id: "comfortable", label: "Comfort" }, { id: "spacious", label: "Spacious" }]} value={qol.density} onChange={setDensity} />
          </div>
          <div>
            <span className="mb-2 block text-xs font-black text-[var(--text-muted)]">Daily play target</span>
            <Segmented options={[{ id: "1", label: "1 game" }, { id: "3", label: "3 games" }, { id: "5", label: "5 games" }]} value={String(qol.dailyGoal.target) as "1" | "3" | "5"} onChange={(value) => setDailyTarget(Number(value) as 1 | 3 | 5)} />
          </div>
        </div>

        <div className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] px-3">
          <Toggle label="Keyboard shortcuts" description="Use Command/Ctrl K, ?, and Alt navigation shortcuts" checked={qol.shortcutsEnabled} onChange={setShortcutsEnabled} />
          <Toggle label="Calm interface during focus" description="De-emphasize navigation while a focus timer runs" checked={qol.focus.interfaceFocus} onChange={setInterfaceFocus} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-extrabold">Sidebar destinations</h2><p className="text-xs text-[var(--text-faint)]">Choose which main destinations appear in navigation.</p></div>
            <button type="button" className="text-xs font-bold text-[var(--accent)]" onClick={restoreNavigation}>Restore all</button>
          </div>
          <div className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] px-3">
            {QOL_STATIC_ROUTES.filter((route) => route.sidebar).map((route) => (
              <label key={route.href} className="flex items-center justify-between gap-3 py-3 text-sm font-semibold">
                <span>{route.emoji} {route.label}</span>
                <input type="checkbox" checked={!qol.hiddenNav.includes(route.href)} onChange={(event) => setNavHidden(route.href, !event.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              </label>
            ))}
          </div>
        </div>

        <div className="my-5 border-t border-[var(--border)]" />
        <WebsiteControls />

        {qol.onboardingDismissed && <button type="button" className="btn mt-5 w-full" onClick={() => dismissOnboarding(false)}>Restore player-tools onboarding checklist</button>}

        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <h2 className="font-extrabold">Shortcut reference</h2>
          <div className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2">
            {[
              ["Cmd / Ctrl K", "Command palette"], ["?", "Open QOL settings"], ["Alt I", "Open Page Guide"], ["Alt H", "Home"], ["Alt G", "Games Hub"], ["Alt O", "Play online"], ["Alt B", "Chess bots"], ["Alt T", "Training"], ["Alt Q", "Open QOL settings"],
            ].map(([keys, action]) => <div key={keys} className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2"><span className="text-[var(--text-muted)]">{action}</span><kbd className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 font-mono text-[0.65rem] font-bold">{keys}</kbd></div>)}
          </div>
        </div>
      </Section>

      <Section icon={<IconPalette width={14} height={14} />} title="Board & style" description="Build the chess board you want to look at for hours." i={1} visible={activeTab === "board"}>
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
      </Section>

      <Section icon={settings.soundEnabled ? <IconVolume width={14} height={14} /> : <IconVolumeOff width={14} height={14} />} title="Sound" description="Balance game, interface and notification audio." i={2} visible={activeTab === "sound"}>
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

      <Section icon={<IconSparkles width={14} height={14} />} title="Gameplay" description="Control how moves, hints and game review behave." i={3} visible={activeTab === "gameplay"}>
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

      <Section icon={<IconMotion width={14} height={14} />} title="Accessibility" description="Make every screen easier to see, hear and navigate." i={4} visible={activeTab === "accessibility"}>
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
      </Section>

      {canModerate && (
          <Section icon={<IconShield width={14} height={14} />} title="Moderation" description="Private owner preferences for the Shield Center." i={5} visible={activeTab === "moderation"}>
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
      )}

      <Section icon={<IconDownload width={15} height={15} />} title="Settings data" description="Back up your preferences, move them to another device or start over." i={6} visible={activeTab === "data"}>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">Chess and interface settings</p>
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
        className={`btn hover-lift mt-3 !justify-start gap-2 !text-sm ${confirmingReset ? "!border-[var(--bad)] !text-[var(--bad)]" : ""}`}
        onClick={handleReset}
      >
        <IconRefresh width={15} height={15} />
        {confirmingReset ? "Click again to confirm" : "Reset to defaults"}
      </button>

      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">QOL and player-tool data</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">Includes website preferences, navigation, favorites, collections, goals and recent activity.</p>
        <div className="mt-3 flex gap-2">
          <button className="btn hover-lift flex-1 !justify-start gap-2 !text-sm" onClick={exportQolData}><IconDownload width={15} height={15} />Export QOL</button>
          <label className="btn hover-lift flex-1 cursor-pointer !justify-start gap-2 !text-sm"><IconDownload width={15} height={15} style={{ transform: "rotate(180deg)" }} />Import QOL<input type="file" accept="application/json" className="hidden" onChange={importQolData} /></label>
        </div>
        {qolImportErr && <p role="alert" className="mt-2 text-xs text-[var(--bad)]">{qolImportErr}</p>}
        <button type="button" className={`btn hover-lift mt-3 w-full !justify-start gap-2 !text-sm ${confirmingQolReset ? "!border-[var(--bad)] !text-[var(--bad)]" : ""}`} onClick={() => { if (confirmingQolReset) { resetQolState(); setConfirmingQolReset(false); } else { setConfirmingQolReset(true); window.setTimeout(() => setConfirmingQolReset(false), 3500); } }}><IconRefresh width={15} height={15} />{confirmingQolReset ? "Click again to erase QOL data" : "Reset QOL and player-tool data"}</button>
      </div>
      </Section>
        </div>
      </div>
    </div>
  );
}
