"use client";

import { useState } from "react";
import type { Color, Square } from "chess.js";
import { illegalCastleFen, clonePieceFen, swapPiecesFen, promoteAnyPawnFen } from "@/lib/cheats/moveManipulation";
import { MoveTrollButtons } from "@/components/cheats/MoveTrollButtons";

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

export interface ModCheatPanelProps {
  onClose: () => void;
  roomId: string;
  /** Current FEN, so move-manipulation cheats can compute a new one to commit via onLoadFen. */
  currentFen: string;
  onLoadFen: (fen: string) => void;
  onForceMove: (from: Square, to: Square, promotion?: string) => void;
  onForceResult: (result: "1-0" | "0-1" | "1/2-1/2") => void;
  onFreeze: (color: Color | "both", frozen: boolean) => void;
  onSwapSides: () => void;
  paused: boolean;
  onTogglePause: () => void;
  onClock: (color: Color, opts: { addSeconds?: number; pause?: boolean; disable?: boolean }) => void;
  onExtendBoth: () => void;
  onResetClocks: () => void;
}

export function ModCheatPanel(props: ModCheatPanelProps) {
  const [fenInput, setFenInput] = useState(props.currentFen);
  const [forceFrom, setForceFrom] = useState("");
  const [forceTo, setForceTo] = useState("");
  const [promoSq, setPromoSq] = useState("");
  const [sq1, setSq1] = useState("");
  const [sq2, setSq2] = useState("");

  const commitFen = (fen: string | null) => {
    if (fen) props.onLoadFen(fen);
  };

  return (
    <div
      className="fixed bottom-4 right-20 z-[90] flex max-h-[80vh] w-80 flex-col overflow-hidden rounded-xl border border-white/15 bg-[#14171f] text-white shadow-2xl"
      style={{ fontFamily: "var(--font-sans, sans-serif)" }}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-3 py-2">
        <span className="text-sm font-bold">🛠️ God Mode</span>
        <button onClick={props.onClose} className="text-white/60 hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Board & game control" defaultOpen>
          <textarea
            className="w-full resize-none rounded bg-white/10 px-1.5 py-1 text-[11px]"
            rows={2}
            value={fenInput}
            onChange={(e) => setFenInput(e.target.value)}
          />
          <button className="rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20" onClick={() => commitFen(fenInput.trim())}>
            Load FEN
          </button>
          <div className="flex items-center gap-1">
            <input
              className="w-14 rounded bg-white/10 px-1.5 py-1 text-xs"
              placeholder="e2"
              value={forceFrom}
              onChange={(e) => setForceFrom(e.target.value)}
            />
            <span className="text-xs text-white/50">→</span>
            <input
              className="w-14 rounded bg-white/10 px-1.5 py-1 text-xs"
              placeholder="e4"
              value={forceTo}
              onChange={(e) => setForceTo(e.target.value)}
            />
            <button
              className="ml-auto rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
              onClick={() => forceFrom && forceTo && props.onForceMove(forceFrom as Square, forceTo as Square)}
            >
              Force move
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Btn onClick={() => props.onForceResult("1-0")}>White wins</Btn>
            <Btn onClick={() => props.onForceResult("1/2-1/2")}>Draw</Btn>
            <Btn onClick={() => props.onForceResult("0-1")}>Black wins</Btn>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Btn onClick={() => props.onFreeze("w", true)}>Freeze W</Btn>
            <Btn onClick={() => props.onFreeze("b", true)}>Freeze B</Btn>
            <Btn onClick={() => props.onFreeze("both", false)}>Unfreeze all</Btn>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn onClick={props.onSwapSides}>⇄ Swap sides</Btn>
            <Btn active={props.paused} onClick={props.onTogglePause}>
              {props.paused ? "▶ Resume" : "⏸ Pause"}
            </Btn>
          </div>
        </Section>

        <Section title="Clock control">
          <div className="grid grid-cols-2 gap-1.5">
            <Btn onClick={() => props.onClock("w", { addSeconds: 30 })}>+30s White</Btn>
            <Btn onClick={() => props.onClock("b", { addSeconds: 30 })}>+30s Black</Btn>
            <Btn onClick={() => props.onClock("w", { addSeconds: -30 })}>−30s White</Btn>
            <Btn onClick={() => props.onClock("b", { addSeconds: -30 })}>−30s Black</Btn>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn onClick={props.onExtendBoth}>+60s both</Btn>
            <Btn onClick={props.onResetClocks}>Reset clocks</Btn>
          </div>
        </Section>

        <Section title="Move manipulation">
          <div className="grid grid-cols-2 gap-1.5">
            <Btn onClick={() => commitFen(illegalCastleFen(props.currentFen, "w", "k"))}>Illegal O-O (W)</Btn>
            <Btn onClick={() => commitFen(illegalCastleFen(props.currentFen, "b", "k"))}>Illegal O-O (B)</Btn>
            <Btn onClick={() => commitFen(illegalCastleFen(props.currentFen, "w", "q"))}>Illegal O-O-O (W)</Btn>
            <Btn onClick={() => commitFen(illegalCastleFen(props.currentFen, "b", "q"))}>Illegal O-O-O (B)</Btn>
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
              onClick={() => sq1 && sq2 && commitFen(clonePieceFen(props.currentFen, sq1 as Square, sq2 as Square))}
            >
              Clone
            </button>
            <button
              className="rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
              onClick={() => sq1 && sq2 && commitFen(swapPiecesFen(props.currentFen, sq1 as Square, sq2 as Square))}
            >
              Swap
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
                onClick={() => promoSq && commitFen(promoteAnyPawnFen(props.currentFen, promoSq as Square, p))}
              >
                {p}
              </button>
            ))}
          </div>
        </Section>

        <Section title="More move trolls">
          <MoveTrollButtons currentFen={props.currentFen} onCommit={commitFen} />
        </Section>
      </div>
    </div>
  );
}
