import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support",
  description: "Help, troubleshooting, safety, and account support for Sam's Arcade.",
};

const fixes = [
  "Check your connection, then pull down or use Reload in the iOS app.",
  "Close and reopen the app if a game worker was interrupted.",
  "Try guest bot play to confirm the board and engine are working.",
  "For sign-in problems, verify the same email and password used on the website.",
  "Keep iOS and Sam's Arcade updated before reporting a repeatable problem.",
];

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <span className="chip !border-[var(--good)]/30 !bg-[var(--good)]/10 !text-[var(--good)]">Player support</span>
      <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">How can we help?</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-muted)]">Sam&apos;s Arcade includes guest play, account controls, safety reporting, and recovery tools directly inside the app.</p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-xl font-black">Quick troubleshooting</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
            {fixes.map((fix, index) => <li key={fix}><strong className="mr-2 text-[var(--accent)]">{index + 1}.</strong>{fix}</li>)}
          </ol>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-black">Account and privacy</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">Open Account to update your profile, notification and privacy choices, sign out other sessions, or permanently delete your account.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/account">Open account</Link>
            <Link className="btn" href="/privacy">Privacy policy</Link>
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-black">Player safety</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">Use the report control attached to a player or game for harassment, cheating, unsafe content, or suspicious behaviour. Moderators can review reports and apply warnings, mutes, suspensions, or bans.</p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-black">Start a clean test</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">No account is required to test the board, bots, puzzles, and training tools.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/play/bot">Play a bot</Link>
            <Link className="btn" href="/puzzles">Open puzzles</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
