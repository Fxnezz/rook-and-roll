"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { HalmaBoard, type HalmaState, type HalmaMove } from "@/components/boardgames/HalmaBoard";
import { halmaEngine } from "@/lib/boardgames/engines/halma";
import { pickHalmaMove } from "@/lib/boardgames/bots/halmaBot";
import { HALMA_RULES } from "@/lib/boardgames/rules";

export default function HalmaBotPage() {
  return (
    <LocalBoardGamePage<HalmaMove, HalmaState>
      title="Halma"
      blurb="Hop your pieces across the board into the opposite corner — first to fill the far camp wins."
      mode="bot"
      gameKey="halma"
      engine={halmaEngine}
      botFn={pickHalmaMove}
      difficulties={[
        { label: "Easy", depth: 1 },
        { label: "Medium", depth: 2 },
        { label: "Hard", depth: 3 },
      ]}
      rules={HALMA_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <HalmaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
