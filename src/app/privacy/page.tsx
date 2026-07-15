import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Sam's Arcade handles account, gameplay, safety, and technical data.",
};

const sections = [
  {
    title: "Information we handle",
    body: (
      <>
        <p>Guest play works without an account. If you create an account, we store the details you provide, such as your email address, username, password hash, profile information, preferences, ratings, achievements, friends, and saved game or puzzle activity.</p>
        <p>For security and moderation, we may process login events, IP address, device or browser information, reports, warnings, and account status. We do not store your plain-text password.</p>
      </>
    ),
  },
  {
    title: "How we use information",
    body: <p>We use information to operate accounts, save progress, calculate ratings, provide multiplayer and social features, prevent abuse, investigate reports, secure the service, and improve reliability.</p>,
  },
  {
    title: "Sharing and service providers",
    body: <p>We use hosting, database, authentication, and real-time infrastructure providers to run Sam&apos;s Arcade. Those providers process limited information on our behalf. We do not sell personal information or use it for cross-app advertising tracking.</p>,
  },
  {
    title: "Account deletion and retention",
    body: (
      <p>
        You can permanently delete your account from <Link className="font-bold text-[var(--accent)]" href="/account">Account → Delete account</Link>. Your profile and account-linked data are removed according to the deletion flow. Some de-identified game history, security records, or moderation records may be retained where reasonably necessary for service integrity or legal obligations.
      </p>
    ),
  },
  {
    title: "Your choices",
    body: <p>You can play many modes as a guest, change privacy and notification preferences in your account, sign out other sessions, and request permanent account deletion. Device-level settings control features such as haptics and notifications when available.</p>,
  },
  {
    title: "Children and safety",
    body: <p>Sam&apos;s Arcade is a general-audience strategy-game service and is not specifically directed to children under 13. Players should not share sensitive personal information through social or reporting features. Safety reports are reviewed using the service&apos;s moderation tools.</p>,
  },
  {
    title: "Changes and contact",
    body: <p>We may update this policy as the service changes. The latest version will remain on this page. For privacy or support questions, use the guidance on the support page.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <span className="chip !border-[var(--accent)]/30 !bg-[var(--accent)]/10 !text-[var(--accent)]">Your data</span>
      <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Privacy Policy</h1>
      <p className="mt-3 text-sm font-semibold text-[var(--text-faint)]">Last updated 15 July 2026</p>
      <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-muted)]">This policy explains how Sam&apos;s Arcade handles information across the website and iOS app.</p>

      <div className="mt-10 space-y-5">
        {sections.map((section) => (
          <section key={section.title} className="panel p-5 sm:p-7">
            <h2 className="text-xl font-black">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-muted)]">{section.body}</div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="btn btn-primary" href="/support">Support</Link>
        <Link className="btn" href="/account">Account controls</Link>
      </div>
    </div>
  );
}
