import { RockPaperScissorsGame } from "@/components/arcade/RockPaperScissorsGame";

export const metadata = { title: "Rock Paper Scissors" };

export default function RockPaperScissorsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Rock Paper Scissors</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        The bot studies your patterns — stay unpredictable to keep winning.
      </p>
      <RockPaperScissorsGame />
    </div>
  );
}
