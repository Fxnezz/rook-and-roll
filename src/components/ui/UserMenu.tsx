"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (status === "loading") {
    return <span className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-elev-2)]" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-1">
        <Link href="/login" className="btn btn-ghost">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-primary hidden sm:inline-flex">
          Sign up
        </Link>
      </div>
    );
  }

  const name = session.user.username ?? session.user.name ?? "Player";
  const initial = name[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[var(--accent-contrast)]"
        aria-label="Account menu"
      >
        {initial}
      </button>
      {open && (
        <div className="panel absolute right-0 top-10 z-50 w-48 overflow-hidden p-1 animate-fade">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-[var(--text-faint)]">{session.user.email}</p>
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <Link
            href={`/u/${session.user.username ?? ""}`}
            className="block rounded px-3 py-2 text-sm hover:bg-[var(--bg-elev)]"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            href="/games"
            className="block rounded px-3 py-2 text-sm hover:bg-[var(--bg-elev)]"
            onClick={() => setOpen(false)}
          >
            My games
          </Link>
          <Link
            href="/friends"
            className="block rounded px-3 py-2 text-sm hover:bg-[var(--bg-elev)]"
            onClick={() => setOpen(false)}
          >
            Friends
          </Link>
          <button
            className="block w-full rounded px-3 py-2 text-left text-sm text-[var(--bad)] hover:bg-[var(--bg-elev)]"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
