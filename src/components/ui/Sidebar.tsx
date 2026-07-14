"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Logo";
import { NAV, isNavActive } from "./nav";

/**
 * chess.com-style fixed left rail, desktop only (md+). Account controls
 * (notifications/settings/user menu) stay in the top Header — their flyouts
 * are anchored `right-0` off a small trigger and would render off-screen if
 * moved into this narrow left column, so this sidebar carries navigation only.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[var(--border)] bg-[var(--panel)] md:flex">
      <Link href="/" className="flex h-14 shrink-0 items-center px-5 transition-transform duration-200 hover:scale-[1.03] active:scale-95">
        <Wordmark />
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                active ? "" : "hover:bg-[var(--bg-elev)]"
              }`}
              style={active ? { color: "var(--accent)", background: "var(--bg-elev-2)" } : { color: "var(--text-muted)" }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                  style={{ background: "var(--accent)" }}
                  aria-hidden="true"
                />
              )}
              <item.icon width={18} height={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
