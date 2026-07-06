"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { LoaBoard, type LoaState, type LoaMove } from "@/components/boardgames/LoaBoard";

export default function LoaPage() {
  return (
    <BoardGamePage<LoaMove, LoaState>
      kind="loa"
      title="Lines of Action"
      blurb="Move as far as the pieces on your line let you — gather your whole army into one connected group to win."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <LoaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
