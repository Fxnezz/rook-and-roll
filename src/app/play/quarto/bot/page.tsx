"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { QuartoBoard, type QuartoState, type QuartoMove } from "@/components/boardgames/QuartoBoard";
import { quartoEngine } from "@/lib/boardgames/engines/quarto";
import { pickQuartoMove } from "@/lib/boardgames/bots/quartoBot";

export default function QuartoBotPage() {
  return (
    <LocalBoardGamePage<QuartoMove, QuartoState>
      title="Quarto"
      blurb="Your opponent picks the piece you must place — get four in a line sharing an attribute to win."
      mode="bot"
      gameKey="quarto"
      engine={quartoEngine}
      botFn={(state, player) => pickQuartoMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <QuartoBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
