import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-16">
      <section className="grid w-full overflow-hidden rounded-[1.75rem] border border-[var(--border-strong)] bg-[var(--panel)] shadow-[var(--shadow-float)] lg:grid-cols-[0.8fr_1.2fr]">
        <div className="not-found-board grid min-h-72 place-items-center border-b border-[var(--border)] p-8 lg:border-b-0 lg:border-r">
          <div className="relative grid h-48 w-48 grid-cols-4 overflow-hidden rounded-2xl border border-[var(--border-strong)] shadow-2xl" aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => <i key={index} className={(Math.floor(index / 4) + index) % 2 === 0 ? "bg-[#e2c18a]" : "bg-[#79583b]"} />)}
            <span className="absolute inset-0 grid place-items-center text-7xl font-black text-white drop-shadow-xl">?</span>
          </div>
        </div>
        <div className="p-6 sm:p-10">
          <div className="flex items-center gap-3"><Logo size={38} /><span className="chip !border-[var(--accent)]/25 !bg-[var(--accent)]/10 !text-[var(--accent)]">Error 404</span></div>
          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">This square is empty.</h1>
          <p className="mt-3 max-w-lg leading-7 text-[var(--text-muted)]">The destination may have moved, been captured, or never existed. Choose a safe next move below.</p>
          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            <Link href="/" className="btn btn-primary !justify-between !px-4 !py-3">Arcade home <span>→</span></Link>
            <Link href="/play" className="btn !justify-between !px-4 !py-3">All 74 games <span>→</span></Link>
            <Link href="/play/bot" className="btn btn-ghost !justify-between !px-4 !py-3">Challenge a bot <span>→</span></Link>
            <Link href="/support" className="btn btn-ghost !justify-between !px-4 !py-3">Get support <span>→</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
