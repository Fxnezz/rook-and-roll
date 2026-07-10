"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { QuoridorBoard, type QuoridorState, type QuoridorMove } from "@/components/boardgames/QuoridorBoard";
import { quoridorEngine } from "@/lib/boardgames/engines/quoridor";
import { QUORIDOR_RULES } from "@/lib/boardgames/rules";

export default function QuoridorLocalPage() {
  return (
    <LocalBoardGamePage<QuoridorMove, QuoridorState>
      title="Quoridor"
      blurb="Race to the far row, or place walls to slow your opponent down — but never seal off either path."
      mode="passplay"
      engine={quoridorEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      rules={QUORIDOR_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <QuoridorBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
