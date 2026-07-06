"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { QuartoBoard, type QuartoState, type QuartoMove } from "@/components/boardgames/QuartoBoard";
import { quartoEngine } from "@/lib/boardgames/engines/quarto";

export default function QuartoLocalPage() {
  return (
    <LocalBoardGamePage<QuartoMove, QuartoState>
      title="Quarto"
      blurb="Your opponent picks the piece you must place — get four in a line sharing an attribute to win."
      mode="passplay"
      engine={quartoEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <QuartoBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
