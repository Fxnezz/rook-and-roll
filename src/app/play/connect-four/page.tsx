"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { ConnectFourBoard, type ConnectFourState } from "@/components/boardgames/ConnectFourBoard";

export default function ConnectFourPage() {
  return (
    <BoardGamePage<{ col: number }, ConnectFourState>
      kind="connect4"
      title="Connect Four"
      blurb="Four in a row — any direction — wins."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove }) => (
        <ConnectFourBoard state={state} mySeat={mySeat} interactive={interactive} onMove={(col) => onMove({ col })} />
      )}
    />
  );
}
