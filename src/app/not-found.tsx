import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Logo size={44} />
      <h1 className="mt-5 text-3xl font-extrabold">404</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        This square is empty. The page you&apos;re looking for moved, was captured, or never existed.
      </p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to the board
      </Link>
    </div>
  );
}
