"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { OthelloBoard, type OthelloState, type OthelloMove } from "@/components/boardgames/OthelloBoard";
import { othelloEngine } from "@/lib/boardgames/engines/othello";
import { pickOthelloMove } from "@/lib/boardgames/bots/othelloBot";

export default function OthelloBotPage() {
  return (
    <LocalBoardGamePage<OthelloMove, OthelloState>
      title="Othello"
      blurb="Flank a line of your opponent's discs to flip them — most discs when the board settles wins."
      mode="bot"
      gameKey="othello"
      engine={othelloEngine}
      botFn={pickOthelloMove}
      difficulties={[
        { label: "Easy", depth: 2 },
        { label: "Medium", depth: 4 },
        { label: "Hard", depth: 6 },
      ]}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <OthelloBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
