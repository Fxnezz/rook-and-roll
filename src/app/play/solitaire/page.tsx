import { SolitaireGame } from "@/components/arcade/SolitaireGame";

export const metadata = { title: "Solitaire" };

export default function SolitairePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Solitaire</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Classic Klondike, draw-1. Click a card to select it (and everything below it), then click a destination.
      </p>
      <SolitaireGame />
    </div>
  );
}
