"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { SimBoard, type SimState, type SimMove } from "@/components/boardgames/SimBoard";
import { simEngine } from "@/lib/boardgames/engines/sim";
import { pickSimMove } from "@/lib/boardgames/bots/simBot";
import { SIM_RULES } from "@/lib/boardgames/rules";

export default function SimBotPage() {
  return (
    <LocalBoardGamePage<SimMove, SimState>
      title="Sim"
      blurb="Color the lines between 6 points — whoever completes a triangle in their own color loses."
      mode="bot"
      gameKey="sim"
      engine={simEngine}
      botFn={pickSimMove}
      difficulties={[
        { label: "Easy", depth: 2 },
        { label: "Medium", depth: 3 },
        { label: "Hard", depth: 5 },
      ]}
      rules={SIM_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <SimBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
