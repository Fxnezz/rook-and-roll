import { BlackjackGame } from "@/components/arcade/BlackjackGame";

export const metadata = { title: "Blackjack" };

export default function BlackjackPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Blackjack</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Get closer to 21 than the dealer without going over. Blackjack pays 3:2.</p>
      <BlackjackGame />
    </div>
  );
}
