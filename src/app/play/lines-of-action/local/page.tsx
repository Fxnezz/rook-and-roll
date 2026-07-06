"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { LoaBoard, type LoaState, type LoaMove } from "@/components/boardgames/LoaBoard";
import { loaEngine } from "@/lib/boardgames/engines/linesofaction";

export default function LoaLocalPage() {
  return (
    <LocalBoardGamePage<LoaMove, LoaState>
      title="Lines of Action"
      blurb="Move as far as the pieces on your line let you — gather your whole army into one connected group to win."
      mode="passplay"
      engine={loaEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <LoaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
