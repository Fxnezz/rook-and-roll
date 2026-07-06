import { SlotMachineGame } from "@/components/arcade/SlotMachineGame";

export const metadata = { title: "Slot Machine" };

export default function SlotMachinePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Slot Machine</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        3 reels, one lever — line up three matching symbols for the big payout.
      </p>
      <SlotMachineGame />
    </div>
  );
}
