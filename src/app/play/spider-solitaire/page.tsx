import { SpiderSolitaireGame } from "@/components/arcade/SpiderSolitaireGame";

export const metadata = { title: "Spider Solitaire" };

export default function SpiderSolitairePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Spider Solitaire</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Two-suit Spider — build same-suit descending runs and clear all 8 King-to-Ace sequences.
      </p>
      <SpiderSolitaireGame />
    </div>
  );
}
