import Link from "next/link";
import { IconShield } from "@/components/ui/icons";
import { ADMIN_OWNER_EMAIL } from "@/lib/admin/owner";
import { requireAdminOwner } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function ShieldAccessPage() {
  await requireAdminOwner();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">← Shield Center</Link>
      <section className="panel mt-4 overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--accent)]/10 p-6">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)]">
            <IconShield width={24} height={24} />
          </span>
          <h1 className="text-2xl font-black">Owner-only access policy</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Shield access cannot be granted, delegated, or transferred from the dashboard. Historical admin and moderator flags no longer unlock these tools.
          </p>
        </div>
        <div className="p-6">
          <p className="label">Authorized account</p>
          <p className="mt-2 break-all rounded-xl border border-[var(--good)]/30 bg-[var(--good)]/10 px-4 py-3 font-mono text-sm font-bold text-[var(--good)]">{ADMIN_OWNER_EMAIL}</p>
          <ul className="mt-5 space-y-2 text-sm text-[var(--text-muted)]">
            <li>✓ Exact email checked in the navigation and page render</li>
            <li>✓ Every moderation API repeats the owner check</li>
            <li>✓ Realtime control tokens carry and verify the owner email</li>
            <li>✓ Former database role flags cannot bypass the policy</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
