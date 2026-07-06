import { BaccaratGame } from "@/components/arcade/BaccaratGame";

export const metadata = { title: "Baccarat" };

export default function BaccaratPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Baccarat</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Punto Banco rules — bet on Player, Banker, or Tie, closest to 9 wins.
      </p>
      <BaccaratGame />
    </div>
  );
}
