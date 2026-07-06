"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { YavalathBoard, type YavalathState, type YavalathMove } from "@/components/boardgames/YavalathBoard";

export default function YavalathPage() {
  return (
    <BoardGamePage<YavalathMove, YavalathState>
      kind="yavalath"
      title="Yavalath"
      blurb="Four in a row wins. Three in a row loses — unless that same move also makes four."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <YavalathBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
