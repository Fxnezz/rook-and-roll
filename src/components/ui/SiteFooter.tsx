"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { openSettingsPanel } from "@/lib/settings/openSettings";

const EXPLORE_LINKS = [
  { href: "/play", label: "All games" },
  { href: "/play/bot", label: "Chess bots" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/training", label: "Training" },
];

const PLAYER_LINKS = [
  { href: "/friends", label: "Friends" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/account", label: "Account" },
  { href: "/support", label: "Support" },
];

export function SiteFooter() {
  const pathname = usePathname();
  const immersive = pathname.startsWith("/play/") || pathname.startsWith("/watch/");
  const privateSurface = pathname.startsWith("/admin") || pathname.startsWith("/mod/");

  if (immersive || privateSurface) return null;

  return (
    <footer className="site-footer border-t border-[var(--border)] md:ml-[232px]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1.4fr_0.8fr_0.8fr] sm:py-14">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Sam's Arcade home">
            <Logo size={36} />
            <span className="text-lg font-black tracking-tight">Sam&apos;s <span className="text-[var(--accent)]">Arcade</span></span>
          </Link>
          <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
            Chess, strategy, cards and arcade games in one player-first home. Built to be fast, customizable and fun on every screen.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="chip !border-[var(--good)]/30 !bg-[var(--good)]/10 !text-[var(--good)]"><i className="h-2 w-2 rounded-full bg-current" /> All systems ready</span>
            <span className="chip">73 games</span>
            <span className="chip">25 bot families</span>
          </div>
        </div>

        <nav aria-label="Explore Sam's Arcade">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-faint)]">Explore</p>
          <div className="mt-4 flex flex-col gap-3">
            {EXPLORE_LINKS.map((link) => <Link key={link.href} href={link.href} className="site-footer-link">{link.label}</Link>)}
          </div>
        </nav>

        <nav aria-label="Player links">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-faint)]">Player</p>
          <div className="mt-4 flex flex-col gap-3">
            {PLAYER_LINKS.map((link) => <Link key={link.href} href={link.href} className="site-footer-link">{link.label}</Link>)}
            <button type="button" onClick={() => openSettingsPanel("accessibility")} className="site-footer-link text-left">Accessibility settings</button>
          </div>
        </nav>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-[var(--text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Sam&apos;s Arcade. Play thoughtfully.</p>
          <div className="flex items-center gap-5 font-bold">
            <Link href="/privacy" className="hover:text-[var(--text)]">Privacy</Link>
            <Link href="/quality-of-life" className="hover:text-[var(--text)]">Patch notes</Link>
            <button type="button" onClick={() => openSettingsPanel("qol")} className="hover:text-[var(--text)]">Website settings</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
