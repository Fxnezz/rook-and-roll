"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { SimBoard, type SimState, type SimMove } from "@/components/boardgames/SimBoard";
import { simEngine } from "@/lib/boardgames/engines/sim";
import { SIM_RULES } from "@/lib/boardgames/rules";

export default function SimLocalPage() {
  return (
    <LocalBoardGamePage<SimMove, SimState>
      title="Sim"
      blurb="Color the lines between 6 points — whoever completes a triangle in their own color loses."
      mode="passplay"
      engine={simEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      rules={SIM_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <SimBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
