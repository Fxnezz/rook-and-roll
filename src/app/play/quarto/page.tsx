"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { QuartoBoard, type QuartoState, type QuartoMove } from "@/components/boardgames/QuartoBoard";

export default function QuartoPage() {
  return (
    <BoardGamePage<QuartoMove, QuartoState>
      kind="quarto"
      title="Quarto"
      blurb="Your opponent picks the piece you must place — get four in a line sharing an attribute to win."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <QuartoBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
