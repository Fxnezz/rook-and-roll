import Link from "next/link";

export function DbNotice() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-elev-2)] text-2xl">
        🗄️
      </span>
      <h1 className="text-xl font-bold">Accounts aren’t set up yet</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        This feature needs a database. Set <code className="font-mono text-[var(--accent)]">DATABASE_URL</code>{" "}
        in your environment (Neon or Supabase) and run <code className="font-mono">npm run db:push</code>. See the
        README for setup.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/play/local" className="btn">
          Pass &amp; Play
        </Link>
        <Link href="/play/bot" className="btn btn-primary">
          Play a bot
        </Link>
      </div>
    </div>
  );
}
