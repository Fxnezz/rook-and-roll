"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-4xl place-items-center px-4 py-16">
      <section className="recovery-card w-full overflow-hidden rounded-[1.75rem] border border-[var(--border-strong)] bg-[var(--panel)] p-6 text-center shadow-[var(--shadow-float)] sm:p-10">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-[var(--bad)]/25 bg-[var(--bad)]/10"><Logo size={44} /></div>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--bad)]">Temporary interruption</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">That move didn&apos;t go through.</h1>
      <p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--text-muted)]">
        The current screen hit an unexpected problem. Your saved preferences and device progress have not been cleared.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-[var(--text-faint)]">ref: {error.digest}</p>
      )}
      <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
        <button className="btn btn-primary !px-5 !py-3" onClick={unstable_retry}>
          Retry this screen
        </button>
        <Link href="/play" className="btn !px-5 !py-3">Open Games Hub</Link>
        <Link href="/" className="btn btn-ghost !px-5 !py-3">Go home</Link>
      </div>
      <p className="mt-6 text-xs text-[var(--text-faint)]">If it happens again, Support can help using the reference above.</p>
      </section>
    </div>
  );
}
