"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { UtttBoard, type UtttState, type UtttMove } from "@/components/boardgames/UtttBoard";

export default function UltimateTicTacToePage() {
  return (
    <BoardGamePage<UtttMove, UtttState>
      kind="ultimatetictactoe"
      title="Ultimate Tic-Tac-Toe"
      blurb="A 3x3 grid of tic-tac-toe boards — your move sends your opponent to the matching sub-board. Win 3 sub-boards in a row."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <UtttBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
