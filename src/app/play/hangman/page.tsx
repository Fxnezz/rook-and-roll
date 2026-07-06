import { HangmanGame } from "@/components/arcade/HangmanGame";

export const metadata = { title: "Hangman" };

export default function HangmanPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Hangman</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Guess the word one letter at a time before you run out of tries.</p>
      <HangmanGame />
    </div>
  );
}
