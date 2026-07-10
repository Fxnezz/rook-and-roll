"use client";

import { useRef, useState } from "react";
import type { Square } from "chess.js";
import {
  stealPieceFen,
  stealRandomPieceFen,
  blockSquareFen,
  barricadeRankFen,
  barricadeSquaresFen,
  duplicateToRandomFen,
  teleportToRandomFen,
  demotePieceFen,
  upgradePieceFen,
  mutatePieceFen,
  defectPieceFen,
  shuffleBackRankFen,
  shufflePawnsFen,
  mirrorPositionFen,
  invertAllColorsFen,
  swapRanksFen,
  swapFilesFen,
  addBonusPieceFen,
  stripPawnsFen,
  nukeAreaFen,
  scrambleEnPassantFen,
} from "@/lib/cheats/moveManipulation";

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

/** All 40 move-related trolls, reusable inside any panel that already has a currentFen + onCommit(fen) mechanism (bot CheatPanel, ModCheatPanel, OwnerCheatPanel). */
export function MoveTrollButtons({ currentFen, onCommit }: { currentFen: string; onCommit: (fen: string) => void }) {
  const [moveSq, setMoveSq] = useState("");
  const [blockColor, setBlockColor] = useState<"w" | "b">("w");
  const [rankA, setRankA] = useState("1");
  const [rankB, setRankB] = useState("8");
  const [fileA, setFileA] = useState("a");
  const [fileB, setFileB] = useState("h");
  const [failed, setFailed] = useState(false);
  const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = (fen: string | null) => {
    if (fen) {
      setFailed(false);
      onCommit(fen);
    } else {
      setFailed(true);
      if (failTimer.current) clearTimeout(failTimer.current);
      failTimer.current = setTimeout(() => setFailed(false), 2000);
    }
  };
  const sq = () => (moveSq.trim() || null) as Square | null;

  const RANDOM_FNS: (() => string | null)[] = [
    () => stealRandomPieceFen(currentFen),
    () => mirrorPositionFen(currentFen),
    () => invertAllColorsFen(currentFen),
    () => shuffleBackRankFen(currentFen, Math.random() < 0.5 ? "w" : "b"),
    () => shufflePawnsFen(currentFen, Math.random() < 0.5 ? "w" : "b"),
    () => addBonusPieceFen(currentFen, Math.random() < 0.5 ? "w" : "b", (["q", "r", "n", "b"] as const)[Math.floor(Math.random() * 4)]),
    () => nukeAreaFen(currentFen, (["a1", "h1", "a8", "h8"] as const)[Math.floor(Math.random() * 4)]),
    () => scrambleEnPassantFen(currentFen),
  ];

  return (
    <>
      <p className="text-[10px] uppercase tracking-wide text-white/50">Steal / vanish</p>
      <div className="flex items-center gap-1">
        <input
          className="w-14 rounded bg-white/10 px-1.5 py-1 text-xs"
          placeholder="e4"
          value={moveSq}
          onChange={(e) => setMoveSq(e.target.value)}
        />
        <button className="rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20" onClick={() => commit(sq() && stealPieceFen(currentFen, sq()!))}>
          🕵️ Steal
        </button>
        <button className="ml-auto rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20" onClick={() => commit(stealRandomPieceFen(currentFen))}>
          💨 Vanish random
        </button>
      </div>

      <p className="text-[10px] uppercase tracking-wide text-white/50">Block / barricade</p>
      <div className="flex items-center gap-1">
        <div className="flex overflow-hidden rounded">
          <button
            className="px-1.5 py-1 text-[10px] font-bold"
            style={{ background: blockColor === "w" ? "var(--accent)" : "rgba(255,255,255,0.08)", color: blockColor === "w" ? "var(--accent-contrast)" : "white" }}
            onClick={() => setBlockColor("w")}
          >
            W
          </button>
          <button
            className="px-1.5 py-1 text-[10px] font-bold"
            style={{ background: blockColor === "b" ? "var(--accent)" : "rgba(255,255,255,0.08)", color: blockColor === "b" ? "var(--accent-contrast)" : "white" }}
            onClick={() => setBlockColor("b")}
          >
            B
          </button>
        </div>
        <button
          className="rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
          onClick={() => commit(sq() && blockSquareFen(currentFen, sq()!, blockColor))}
        >
          🧱 Block square
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn onClick={() => commit(barricadeRankFen(currentFen, 1, "w"))}>Barricade rank 1 (W)</Btn>
        <Btn onClick={() => commit(barricadeRankFen(currentFen, 8, "b"))}>Barricade rank 8 (B)</Btn>
        <Btn onClick={() => commit(barricadeRankFen(currentFen, 2, "w"))}>Barricade rank 2 (W)</Btn>
        <Btn onClick={() => commit(barricadeRankFen(currentFen, 7, "b"))}>Barricade rank 7 (B)</Btn>
        <Btn onClick={() => commit(barricadeSquaresFen(currentFen, ["d4", "d5", "e4", "e5"], blockColor))}>Barricade center</Btn>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn onClick={() => commit(nukeAreaFen(currentFen, "a1" as Square))}>💣 Nuke a1</Btn>
        <Btn onClick={() => commit(nukeAreaFen(currentFen, "h1" as Square))}>💣 Nuke h1</Btn>
        <Btn onClick={() => commit(nukeAreaFen(currentFen, "a8" as Square))}>💣 Nuke a8</Btn>
        <Btn onClick={() => commit(nukeAreaFen(currentFen, "h8" as Square))}>💣 Nuke h8</Btn>
        <Btn onClick={() => commit(nukeAreaFen(currentFen, "b1" as Square))}>💣 Nuke b1</Btn>
        <Btn onClick={() => commit(nukeAreaFen(currentFen, "g1" as Square))}>💣 Nuke g1</Btn>
        <Btn onClick={() => commit(nukeAreaFen(currentFen, "b8" as Square))}>💣 Nuke b8</Btn>
        <Btn onClick={() => commit(nukeAreaFen(currentFen, "g8" as Square))}>💣 Nuke g8</Btn>
      </div>

      <p className="text-[10px] uppercase tracking-wide text-white/50">Duplicate / teleport</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn onClick={() => commit(sq() && duplicateToRandomFen(currentFen, sq()!))}>🧬 Clone → random</Btn>
        <Btn onClick={() => commit(sq() && teleportToRandomFen(currentFen, sq()!))}>🌀 Teleport → random</Btn>
      </div>

      <p className="text-[10px] uppercase tracking-wide text-white/50">Power shift (uses square above)</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn onClick={() => commit(sq() && demotePieceFen(currentFen, sq()!))}>📉 Demote</Btn>
        <Btn onClick={() => commit(sq() && upgradePieceFen(currentFen, sq()!))}>📈 Upgrade</Btn>
        <Btn onClick={() => commit(sq() && mutatePieceFen(currentFen, sq()!))}>🎲 Mystery piece</Btn>
        <Btn onClick={() => commit(sq() && defectPieceFen(currentFen, sq()!))}>🔄 Defect</Btn>
      </div>

      <p className="text-[10px] uppercase tracking-wide text-white/50">Whole-army shuffles</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn onClick={() => commit(shuffleBackRankFen(currentFen, "w"))}>♟️ Shuffle back rank (W)</Btn>
        <Btn onClick={() => commit(shuffleBackRankFen(currentFen, "b"))}>♟️ Shuffle back rank (B)</Btn>
        <Btn onClick={() => commit(shufflePawnsFen(currentFen, "w"))}>♙ Shuffle pawns (W)</Btn>
        <Btn onClick={() => commit(shufflePawnsFen(currentFen, "b"))}>♟ Shuffle pawns (B)</Btn>
      </div>

      <p className="text-[10px] uppercase tracking-wide text-white/50">Whole-board transforms</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn onClick={() => commit(mirrorPositionFen(currentFen))}>🪞 Mirror position</Btn>
        <Btn onClick={() => commit(invertAllColorsFen(currentFen))}>🌍 Invert all colors</Btn>
      </div>

      <p className="text-[10px] uppercase tracking-wide text-white/50">Rank / file swaps</p>
      <div className="flex items-center gap-1">
        <input className="w-10 rounded bg-white/10 px-1.5 py-1 text-xs" value={rankA} onChange={(e) => setRankA(e.target.value)} />
        <span className="text-xs text-white/50">↔</span>
        <input className="w-10 rounded bg-white/10 px-1.5 py-1 text-xs" value={rankB} onChange={(e) => setRankB(e.target.value)} />
        <button
          className="ml-auto rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
          onClick={() => commit(swapRanksFen(currentFen, Number(rankA) || 1, Number(rankB) || 8))}
        >
          Swap ranks
        </button>
      </div>
      <div className="flex items-center gap-1">
        <input className="w-10 rounded bg-white/10 px-1.5 py-1 text-xs" value={fileA} onChange={(e) => setFileA(e.target.value)} />
        <span className="text-xs text-white/50">↔</span>
        <input className="w-10 rounded bg-white/10 px-1.5 py-1 text-xs" value={fileB} onChange={(e) => setFileB(e.target.value)} />
        <button
          className="ml-auto rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
          onClick={() => commit(swapFilesFen(currentFen, fileA.trim() || "a", fileB.trim() || "h"))}
        >
          Swap files
        </button>
      </div>

      <p className="text-[10px] uppercase tracking-wide text-white/50">Chaos additions</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn onClick={() => commit(addBonusPieceFen(currentFen, "w", "q"))}>👑 Bonus queen (W)</Btn>
        <Btn onClick={() => commit(addBonusPieceFen(currentFen, "b", "q"))}>👑 Bonus queen (B)</Btn>
        <Btn onClick={() => commit(addBonusPieceFen(currentFen, "w", "r"))}>🏰 Bonus rook (W)</Btn>
        <Btn onClick={() => commit(addBonusPieceFen(currentFen, "b", "r"))}>🏰 Bonus rook (B)</Btn>
        <Btn onClick={() => commit(addBonusPieceFen(currentFen, "w", "n"))}>🐴 Bonus knight (W)</Btn>
        <Btn onClick={() => commit(addBonusPieceFen(currentFen, "b", "n"))}>🐴 Bonus knight (B)</Btn>
        <Btn onClick={() => commit(addBonusPieceFen(currentFen, Math.random() < 0.5 ? "w" : "b", "b"))}>♟️ Bonus bishop (random side)</Btn>
        <Btn onClick={() => commit(stripPawnsFen(currentFen, "w"))}>🚫 Strip pawns (W)</Btn>
        <Btn onClick={() => commit(stripPawnsFen(currentFen, "b"))}>🚫 Strip pawns (B)</Btn>
      </div>

      <p className="text-[10px] uppercase tracking-wide text-white/50">Misc</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn onClick={() => commit(scrambleEnPassantFen(currentFen))}>👻 Scramble en passant</Btn>
        <Btn onClick={() => commit(RANDOM_FNS[Math.floor(Math.random() * RANDOM_FNS.length)]())}>🧨 Chaos (random)</Btn>
      </div>

      {failed && (
        <p className="text-[10px] text-[var(--bad)]">No effect — square empty, king targeted, or not enough pieces.</p>
      )}
    </>
  );
}
