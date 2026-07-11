"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { YGameBoard, type YGameState, type YGameMove } from "@/components/boardgames/YGameBoard";
import { yGameEngine } from "@/lib/boardgames/engines/ygame";
import { pickYGameMove } from "@/lib/boardgames/bots/ygameBot";

export default function YGameBotPage() {
  return (
    <LocalBoardGamePage<YGameMove, YGameState>
      title="Y"
      blurb="Connect all three sides of the triangle with one unbroken group of stones — no draws are possible."
      mode="bot"
      gameKey="y-game"
      engine={yGameEngine}
      botFn={pickYGameMove}
      difficulties={[
        { label: "Easy", depth: 1 },
        { label: "Medium", depth: 2 },
        { label: "Hard", depth: 3 },
      ]}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <YGameBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
