"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { YavalathBoard, type YavalathState, type YavalathMove } from "@/components/boardgames/YavalathBoard";
import { yavalathEngine } from "@/lib/boardgames/engines/yavalath";
import { pickYavalathMove } from "@/lib/boardgames/bots/yavalathBot";
import { YAVALATH_RULES } from "@/lib/boardgames/rules";

export default function YavalathBotPage() {
  return (
    <LocalBoardGamePage<YavalathMove, YavalathState>
      title="Yavalath"
      blurb="Four in a row wins. Three in a row loses — unless that same move also makes four."
      mode="bot"
      gameKey="yavalath"
      engine={yavalathEngine}
      botFn={pickYavalathMove}
      difficulties={[
        { label: "Easy", depth: 1 },
        { label: "Medium", depth: 2 },
        { label: "Hard", depth: 3 },
      ]}
      rules={YAVALATH_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <YavalathBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
