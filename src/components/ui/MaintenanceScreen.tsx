import { Logo } from "./Logo";

export function MaintenanceScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Logo size={48} />
      <h1 className="mt-5 text-2xl font-extrabold">Back soon</h1>
      <p className="mt-2 max-w-sm text-[var(--text-muted)]">
        Rook &amp; Roll is down for a quick bit of maintenance. Thanks for your patience — we&apos;ll
        be back on the board shortly.
      </p>
    </div>
  );
}
