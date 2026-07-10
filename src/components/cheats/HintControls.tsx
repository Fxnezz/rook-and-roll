"use client";

import type { Color } from "chess.js";

function Btn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="rounded px-2 py-1.5 text-left text-xs font-semibold transition-colors"
      style={{
        background: active ? "var(--accent)" : "rgba(255,255,255,0.08)",
        color: active ? "var(--accent-contrast)" : "white",
      }}
    >
      {children}
    </button>
  );
}

export interface HintControlsProps {
  onRequestHint: () => void;
  hintLoading: boolean;
  autoHint: boolean;
  onAutoHintChange: (v: boolean) => void;
  autoMoveColor: Color | null;
  onAutoMoveColorChange: (c: Color | null) => void;
  sendHintToOpponent: boolean;
  onSendHintToOpponentChange: (v: boolean) => void;
}

/** Hint/auto-hint analysis, auto-move god-mode, and opponent-hint delivery — shared between ModCheatPanel and OwnerCheatPanel. */
export function HintControls(props: HintControlsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          className="rounded bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
          disabled={props.hintLoading}
          onClick={props.onRequestHint}
        >
          {props.hintLoading ? "Thinking…" : "💡 Hint"}
        </button>
        <Btn active={props.autoHint} onClick={() => props.onAutoHintChange(!props.autoHint)}>
          Auto-hint: {props.autoHint ? "on" : "off"}
        </Btn>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-white/70">
        <input
          type="checkbox"
          checked={props.sendHintToOpponent}
          onChange={(e) => props.onSendHintToOpponentChange(e.target.checked)}
        />
        Also send this hint to the opponent
      </label>
      <p className="text-[10px] uppercase tracking-wide text-white/50">Auto move</p>
      <div className="grid grid-cols-3 gap-1.5">
        <Btn active={props.autoMoveColor === "w"} onClick={() => props.onAutoMoveColorChange(props.autoMoveColor === "w" ? null : "w")}>
          White
        </Btn>
        <Btn active={props.autoMoveColor === null} onClick={() => props.onAutoMoveColorChange(null)}>
          Off
        </Btn>
        <Btn active={props.autoMoveColor === "b"} onClick={() => props.onAutoMoveColorChange(props.autoMoveColor === "b" ? null : "b")}>
          Black
        </Btn>
      </div>
    </>
  );
}
