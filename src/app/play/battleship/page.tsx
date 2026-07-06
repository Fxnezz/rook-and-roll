import { BattleshipGame } from "@/components/arcade/BattleshipGame";

export const metadata = { title: "Battleship" };

export default function BattleshipPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Battleship</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Take turns firing at each other's fleet — sink every enemy ship to win.
      </p>
      <BattleshipGame />
    </div>
  );
}
