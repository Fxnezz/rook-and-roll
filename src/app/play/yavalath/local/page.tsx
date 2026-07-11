"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { YavalathBoard, type YavalathState, type YavalathMove } from "@/components/boardgames/YavalathBoard";
import { yavalathEngine } from "@/lib/boardgames/engines/yavalath";
import { YAVALATH_RULES } from "@/lib/boardgames/rules";

export default function YavalathLocalPage() {
  return (
    <LocalBoardGamePage<YavalathMove, YavalathState>
      title="Yavalath"
      blurb="Four in a row wins. Three in a row loses — unless that same move also makes four."
      mode="passplay"
      engine={yavalathEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      rules={YAVALATH_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <YavalathBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
