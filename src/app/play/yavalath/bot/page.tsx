"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { YavalathBoard, type YavalathState, type YavalathMove } from "@/components/boardgames/YavalathBoard";
import { yavalathEngine } from "@/lib/boardgames/engines/yavalath";
import { pickYavalathMove } from "@/lib/boardgames/bots/yavalathBot";

export default function YavalathBotPage() {
  return (
    <LocalBoardGamePage<YavalathMove, YavalathState>
      title="Yavalath"
      blurb="Four in a row wins. Three in a row loses — unless that same move also makes four."
      mode="bot"
      engine={yavalathEngine}
      botFn={(state, player) => pickYavalathMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <YavalathBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
