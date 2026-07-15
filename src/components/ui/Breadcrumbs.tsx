"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

/** Compact "Home > Section" trail under the header, derived from the current
 * path matching a top-level NAV entry. Silent (renders nothing) on the
 * homepage or on routes that don't map to a NAV section. */
export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const section = NAV.find((n) => (n.href === "/play" ? pathname === "/play" : pathname.startsWith(n.href)));
  if (!section) return null;

  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 py-1.5 text-xs text-[var(--text-faint)]">
      <Link href="/" className="hover:text-[var(--text-muted)]">
        Home
      </Link>
      <span className="mx-1.5">/</span>
      {pathname === section.href ? (
        <span className="text-[var(--text-muted)]">{section.label}</span>
      ) : (
        <Link href={section.href} className="hover:text-[var(--text-muted)]">
          {section.label}
        </Link>
      )}
    </nav>
  );
}
