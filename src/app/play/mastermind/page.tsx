import { MastermindGame } from "@/components/arcade/MastermindGame";

export const metadata = { title: "Mastermind" };

export default function MastermindPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Mastermind</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Crack the 4-color secret code — black pegs mean right color and spot, white means right color, wrong spot.
      </p>
      <MastermindGame />
    </div>
  );
}
