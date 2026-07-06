"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { QuoridorBoard, type QuoridorState, type QuoridorMove } from "@/components/boardgames/QuoridorBoard";

export default function QuoridorPage() {
  return (
    <BoardGamePage<QuoridorMove, QuoridorState>
      kind="quoridor"
      title="Quoridor"
      blurb="Race to the far row, or place walls to slow your opponent down — but never seal off either path."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <QuoridorBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
