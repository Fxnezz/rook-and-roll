"use client";

import { useState } from "react";
import type { Square } from "chess.js";
import type { BotOverride, BotPersonality } from "@/lib/cheats/botManipulation";

export interface CheatLogEntry {
  id: number;
  text: string;
  ts: number;
}

export interface CheatPanelProps {
  onClose: () => void;
  log: CheatLogEntry[];

  // Category 1 — move manipulation
  onIllegalCastle: (side: "k" | "q") => void;
  onClonePiece: (from: Square, to: Square) => void;
  onSwapPieces: (sq1: Square, sq2: Square) => void;
  onReverseMoves: (n: number) => void;
  onPromotePawn: (square: Square, piece: "q" | "r" | "b" | "n") => void;

  // Category 2 — bot manipulation
  botOverride: BotOverride;
  onBotOverrideChange: (patch: Partial<BotOverride>) => void;
  showPredictedMove: boolean;
  onShowPredictedMoveChange: (v: boolean) => void;

  // Category 3 — time/session
  onFreezeClock: (side: "w" | "b", frozen: boolean) => void;
  frozenSides: { w: boolean; b: boolean };
  onAddTime: (side: "w" | "b", seconds: number) => void;
  onInstantResult: (result: "win" | "loss" | "draw") => void;

  // Category 5 — cosmetic
  effects: { explodeCaptures: boolean; confettiOnCheckmate: boolean; dramaticZoom: boolean; pieceVoiceLines: boolean };
  onEffectsChange: (patch: Partial<CheatPanelProps["effects"]>) => void;

  // Category 6 — Stockfish assist
  onStockfishAssist: () => void;
  assistRunning: boolean;
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-white/70 hover:text-white"
      >
        {title}
        <span className="text-white/40">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>}
    </div>
  );
}

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

export function CheatPanel(props: CheatPanelProps) {
  const [sq1, setSq1] = useState("");
  const [sq2, setSq2] = useState("");
  const [reverseN, setReverseN] = useState(1);
  const [promoSq, setPromoSq] = useState("");

  return (
    <div
      className="fixed bottom-4 right-4 z-[90] flex max-h-[80vh] w-80 flex-col overflow-hidden rounded-xl border border-white/15 bg-[#14171f] text-white shadow-2xl"
      style={{ fontFamily: "var(--font-sans, sans-serif)" }}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-3 py-2">
        <span className="text-sm font-bold">🍪 Cheat Panel</span>
        <button onClick={props.onClose} className="text-white/60 hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Move manipulation" defaultOpen>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn onClick={() => props.onIllegalCastle("k")}>Illegal O-O</Btn>
            <Btn onClick={() => props.onIllegalCastle("q")}>Illegal O-O-O</Btn>
          </div>
          <div className="flex items-center gap-1">
            <input
              className="w-14 rounded bg-white/10 px-1.5 py-1 text-xs"
              placeholder="e2"
              value={sq1}
              onChange={(e) => setSq1(e.target.value)}
            />
            <span className="text-xs text-white/50">→</span>
            <input
              className="w-14 rounded bg-white/10 px-1.5 py-1 text-xs"
              placeholder="e4"
              value={sq2}
              onChange={(e) => setSq2(e.target.value)}
            />
            <button
              className="ml-auto rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
              onClick={() => sq1 && sq2 && props.onClonePiece(sq1 as Square, sq2 as Square)}
            >
              Clone
            </button>
            <button
              className="rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
              onClick={() => sq1 && sq2 && props.onSwapPieces(sq1 as Square, sq2 as Square)}
            >
              Swap
            </button>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              className="w-14 rounded bg-white/10 px-1.5 py-1 text-xs"
              value={reverseN}
              onChange={(e) => setReverseN(Math.max(1, Number(e.target.value) || 1))}
            />
            <span className="text-xs text-white/50">half-moves back</span>
            <button
              className="ml-auto rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
              onClick={() => props.onReverseMoves(reverseN)}
            >
              Rewind
            </button>
          </div>
          <div className="flex items-center gap-1">
            <input
              className="w-14 rounded bg-white/10 px-1.5 py-1 text-xs"
              placeholder="e5"
              value={promoSq}
              onChange={(e) => setPromoSq(e.target.value)}
            />
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button
                key={p}
                className="rounded bg-white/10 px-2 py-1 text-xs font-semibold uppercase hover:bg-white/20"
                onClick={() => promoSq && props.onPromotePawn(promoSq as Square, p)}
              >
                {p}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Bot manipulation">
          <Btn active={props.botOverride.blunderMode} onClick={() => props.onBotOverrideChange({ blunderMode: !props.botOverride.blunderMode })}>
            {props.botOverride.blunderMode ? "☑" : "☐"} Blunder mode
          </Btn>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-white/50">Skill override (0–20)</span>
            <input
              type="range"
              min={0}
              max={20}
              value={props.botOverride.skillOverride ?? 10}
              onChange={(e) => props.onBotOverrideChange({ skillOverride: Number(e.target.value) })}
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>{props.botOverride.skillOverride ?? "tier default"}</span>
              <button className="underline" onClick={() => props.onBotOverrideChange({ skillOverride: null })}>
                reset
              </button>
            </div>
          </div>
          <Btn active={props.showPredictedMove} onClick={() => props.onShowPredictedMoveChange(!props.showPredictedMove)}>
            {props.showPredictedMove ? "☑" : "☐"} Show predicted bot move
          </Btn>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-white/50">Personality</span>
            <div className="grid grid-cols-2 gap-1">
              {(["normal", "aggressive", "passive", "random"] as BotPersonality[]).map((p) => (
                <Btn key={p} active={props.botOverride.personality === p} onClick={() => props.onBotOverrideChange({ personality: p })}>
                  {p}
                </Btn>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Time & session">
          <div className="grid grid-cols-2 gap-1.5">
            <Btn active={props.frozenSides.w} onClick={() => props.onFreezeClock("w", !props.frozenSides.w)}>
              {props.frozenSides.w ? "☑" : "☐"} Freeze White
            </Btn>
            <Btn active={props.frozenSides.b} onClick={() => props.onFreezeClock("b", !props.frozenSides.b)}>
              {props.frozenSides.b ? "☑" : "☐"} Freeze Black
            </Btn>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn onClick={() => props.onAddTime("w", 30)}>+30s White</Btn>
            <Btn onClick={() => props.onAddTime("b", 30)}>+30s Black</Btn>
            <Btn onClick={() => props.onAddTime("w", -30)}>−30s White</Btn>
            <Btn onClick={() => props.onAddTime("b", -30)}>−30s Black</Btn>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Btn onClick={() => props.onInstantResult("win")}>Instant win</Btn>
            <Btn onClick={() => props.onInstantResult("loss")}>Instant loss</Btn>
            <Btn onClick={() => props.onInstantResult("draw")}>Instant draw</Btn>
          </div>
        </Section>

        <Section title="Stockfish assist">
          <button
            className="btn btn-primary !py-1.5 text-xs"
            disabled={props.assistRunning}
            onClick={props.onStockfishAssist}
          >
            {props.assistRunning ? "Thinking…" : "Play my move (depth 10)"}
          </button>
        </Section>

        <Section title="Fun / cosmetic">
          <Btn active={props.effects.explodeCaptures} onClick={() => props.onEffectsChange({ explodeCaptures: !props.effects.explodeCaptures })}>
            {props.effects.explodeCaptures ? "☑" : "☐"} Explode captures
          </Btn>
          <Btn
            active={props.effects.confettiOnCheckmate}
            onClick={() => props.onEffectsChange({ confettiOnCheckmate: !props.effects.confettiOnCheckmate })}
          >
            {props.effects.confettiOnCheckmate ? "☑" : "☐"} Confetti on checkmate
          </Btn>
          <Btn active={props.effects.dramaticZoom} onClick={() => props.onEffectsChange({ dramaticZoom: !props.effects.dramaticZoom })}>
            {props.effects.dramaticZoom ? "☑" : "☐"} Dramatic zoom
          </Btn>
          <Btn active={props.effects.pieceVoiceLines} onClick={() => props.onEffectsChange({ pieceVoiceLines: !props.effects.pieceVoiceLines })}>
            {props.effects.pieceVoiceLines ? "☑" : "☐"} Piece voice lines
          </Btn>
        </Section>
      </div>

      <div className="max-h-28 overflow-y-auto border-t border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/60">
        {props.log.length === 0 ? (
          <p className="text-white/30">No cheats fired yet this session.</p>
        ) : (
          props.log
            .slice()
            .reverse()
            .map((l) => (
              <div key={l.id}>
                <span className="text-white/30">{new Date(l.ts).toLocaleTimeString()}</span> {l.text}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
