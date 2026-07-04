"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { ConnectFourBoard, type ConnectFourState, type ConnectFourMove } from "@/components/boardgames/ConnectFourBoard";
import { connectFourEngine } from "@/lib/boardgames/engines/connectFour";

export default function ConnectFourLocalPage() {
  return (
    <LocalBoardGamePage<ConnectFourMove, ConnectFourState>
      title="Connect Four"
      blurb="Four in a row — any direction — wins."
      mode="passplay"
      engine={connectFourEngine}
      seatLabel={(s) => (s === "a" ? "Red" : "Yellow")}
      renderBoard={({ state, mySeat, interactive, onMove, status }) => (
        <ConnectFourBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} status={status} />
      )}
    />
  );
}
