import { VideoPokerGame } from "@/components/arcade/VideoPokerGame";

export const metadata = { title: "Video Poker" };

export default function VideoPokerPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Video Poker</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Jacks or Better — hold the cards you want, draw the rest, and hope for a paying hand.
      </p>
      <VideoPokerGame />
    </div>
  );
}
