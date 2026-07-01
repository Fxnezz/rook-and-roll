"use client";

import { useSettings } from "@/lib/chess/useSettings";
import { BOARD_THEMES } from "@/lib/chess/themes";
import { PIECE_SETS, Piece } from "@/lib/pieces";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between py-2"
      onClick={() => onChange(!checked)}
    >
      <span className="text-sm text-[var(--text)]">{label}</span>
      <span
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: checked ? "var(--accent)" : "var(--border-strong)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}

export function SettingsPanel() {
  const { settings, update } = useSettings();

  return (
    <div className="flex flex-col gap-5 p-4">
      <section>
        <span className="label mb-2 block">Board theme</span>
        <div className="grid grid-cols-2 gap-2">
          {BOARD_THEMES.map((t) => {
            const active = settings.boardTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => update({ boardTheme: t.id })}
                className="flex items-center gap-2 rounded-lg border p-2 transition-colors"
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
      </section>

      <section>
        <span className="label mb-2 block">Piece set</span>
        <div className="grid grid-cols-2 gap-2">
          {PIECE_SETS.map((s) => {
            const active = settings.pieceSet === s.id;
            return (
              <button
                key={s.id}
                onClick={() => update({ pieceSet: s.id })}
                className="flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors"
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
      </section>

      <div className="h-px bg-[var(--border)]" />

      <section>
        <Toggle
          label="Sound effects"
          checked={settings.soundEnabled}
          onChange={(v) => update({ soundEnabled: v })}
        />
        {settings.soundEnabled && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        )}
        <Toggle
          label="Show coordinates"
          checked={settings.showCoordinates}
          onChange={(v) => update({ showCoordinates: v })}
        />
        <Toggle
          label="Show legal moves"
          checked={settings.showLegalMoves}
          onChange={(v) => update({ showLegalMoves: v })}
        />
        <Toggle
          label="Highlight last move"
          checked={settings.highlightLastMove}
          onChange={(v) => update({ highlightLastMove: v })}
        />
        <Toggle label="Animate pieces" checked={settings.animate} onChange={(v) => update({ animate: v })} />
        <Toggle
          label="Auto-flip each turn (pass & play)"
          checked={settings.autoFlip}
          onChange={(v) => update({ autoFlip: v })}
        />
      </section>
    </div>
  );
}
