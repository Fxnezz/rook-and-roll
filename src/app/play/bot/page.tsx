import Link from "next/link";
import { IconRobot } from "@/components/ui/icons";

export default function BotComingSoon() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-elev-2)] text-[var(--accent)]">
        <IconRobot width={28} height={28} />
      </span>
      <h1 className="text-2xl font-bold">Bots are almost ready</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        Stockfish-powered opponents with difficulty tiers from beginner to expert are coming in the
        next phase. For now, grab a friend and play locally.
      </p>
      <Link href="/play/local" className="btn btn-primary mt-6">
        Pass &amp; Play
      </Link>
    </div>
  );
}
