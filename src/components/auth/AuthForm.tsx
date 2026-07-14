"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Wordmark } from "@/components/ui/Logo";
import { IconCheck, IconChevronRight, IconPuzzle, IconSparkles, IconTrophy } from "@/components/ui/icons";
import { Piece } from "@/lib/pieces";
import { getTheme } from "@/lib/chess/themes";

type AuthPiece = { type: "p" | "r" | "n" | "b" | "q" | "k"; color: "w" | "b" };

const AUTH_POSITION = [
  "r...k..r",
  "ppp..ppp",
  "..n.qn..",
  "...pp...",
  "..B.P...",
  "..N..N..",
  "PPP..PPP",
  "R..Q.RK.",
];

const ACCOUNT_BENEFITS = [
  { icon: IconTrophy, title: "A rating that follows you", detail: "Play rated games and see your progress over time." },
  { icon: IconSparkles, title: "Every game, ready to review", detail: "Keep your history and return to the moments that mattered." },
  { icon: IconPuzzle, title: "Training that remembers", detail: "Build puzzle streaks and keep improving between games." },
];

function authPiece(symbol: string): AuthPiece | null {
  if (symbol === ".") return null;
  return {
    type: symbol.toLowerCase() as AuthPiece["type"],
    color: symbol === symbol.toUpperCase() ? "w" : "b",
  };
}

function AccountPreview() {
  const theme = getTheme("forest");
  const pieces = AUTH_POSITION.flatMap((row) => [...row].map(authPiece));

  return (
    <div className="relative mx-auto w-full max-w-[20rem]" aria-hidden="true">
      <div className="absolute -inset-10 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="relative rotate-[-2deg] rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] p-3 shadow-[var(--shadow)]">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <span className="text-xs font-black">Your game archive</span>
          <span className="rounded-md bg-[var(--good)]/12 px-2 py-1 text-[10px] font-black text-[var(--good)]">+18 rating</span>
        </div>
        <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-lg ring-1 ring-[var(--border-strong)]">
          {pieces.map((piece, index) => {
            const row = Math.floor(index / 8);
            const column = index % 8;
            const light = (row + column) % 2 === 0;
            const highlighted = (row === 3 && column === 3) || (row === 4 && column === 4);
            return (
              <span key={index} className="relative" style={{ background: light ? theme.light : theme.dark }}>
                {highlighted && <span className="absolute inset-0" style={{ background: theme.lastMove }} />}
                {piece && (
                  <span className="absolute inset-[8%]">
                    <Piece type={piece.type} color={piece.color} set="monarch" />
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[var(--bg-elev)] px-3 py-2">
          <span className="text-[11px] font-bold">Italian Game</span>
          <span className="text-[10px] font-semibold text-[var(--text-faint)]">92% accuracy</span>
        </div>
      </div>
    </div>
  );
}

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: "Use at least 8 characters" };
  if (password.length < 8) return { score: 0, label: "Too short" };
  let score = 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["Too short", "Getting there", "Good", "Strong", "Excellent"];
  return { score, label: labels[score] };
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const strength = passwordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignup) {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not create account.");
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(isSignup ? "Account created, but sign-in failed. Try logging in." : "Invalid email or password.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden px-4 py-8 sm:py-12 lg:py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_22%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_34%)]" />
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[1.75rem] border border-[var(--border-strong)] bg-[var(--panel)] shadow-[var(--shadow)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[var(--bg-elev)] p-10 lg:flex lg:flex-col lg:justify-between" aria-labelledby="account-benefits-heading">
          <div>
            <span className="chip mb-5 !border-[var(--accent)]/25 !bg-[var(--accent)]/10 !text-[var(--accent-strong)]">
              Your chess home
            </span>
            <p id="account-benefits-heading" className="max-w-md text-4xl font-black leading-[1.03] tracking-[-0.04em]">
              Your next move, <span className="text-[var(--accent)]">remembered.</span>
            </p>
            <p className="mt-4 max-w-md leading-7 text-[var(--text-muted)]">
              One free account connects your games, ratings, puzzles, and training across Sam&apos;s Arcade.
            </p>
          </div>

          <div className="my-9">
            <AccountPreview />
          </div>

          <div className="space-y-3">
            {ACCOUNT_BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)]/75 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                  <benefit.icon width={17} height={17} />
                </span>
                <div>
                  <p className="text-sm font-black">{benefit.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-faint)]">{benefit.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
          <Link href="/" className="mb-7 inline-flex w-fit transition-transform hover:translate-x-0.5" aria-label="Sam's Arcade home">
            <Wordmark size={34} />
          </Link>

          <div className="mb-6 lg:hidden">
            <span className="chip mb-3">Free account · Guest play stays open</span>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3 text-center">
                  <benefit.icon width={17} height={17} className="mx-auto text-[var(--accent)]" />
                  <span className="mt-1.5 block text-[10px] font-bold leading-4 text-[var(--text-muted)]">{benefit.title}</span>
                </div>
              ))}
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {isSignup ? "Create a free account and keep your progress wherever you play." : "Your games, progress, and next challenge are waiting."}
          </p>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4" aria-busy={loading}>
          <div>
            <label htmlFor="auth-email" className="label mb-1.5 block">Email</label>
            <input
              id="auth-email"
              className="input !font-sans"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          {isSignup && (
            <div>
              <label htmlFor="auth-username" className="label mb-1.5 block">Username</label>
              <input
                id="auth-username"
                className="input !font-sans"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_chess_name"
                pattern="[A-Za-z0-9_]{3,20}"
                minLength={3}
                maxLength={20}
                aria-describedby="username-help"
                required
              />
              <p id="username-help" className="mt-1.5 text-[11px] font-medium text-[var(--text-faint)]">3–20 letters, numbers, or underscores.</p>
            </div>
          )}
          <div>
            <label htmlFor="auth-password" className="label mb-1.5 block">Password</label>
            <div className="relative">
              <input
                id="auth-password"
                className="input !pr-16 !font-sans"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={isSignup ? 8 : undefined}
                aria-describedby={isSignup ? "password-strength" : undefined}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 text-xs font-bold text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {isSignup && (
              <div id="password-strength" className="mt-2" aria-live="polite">
                <div className="grid grid-cols-4 gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={`h-1 rounded-full transition-colors ${level <= strength.score ? (strength.score >= 3 ? "bg-[var(--good)]" : "bg-[var(--accent)]") : "bg-[var(--bg-elev-2)]"}`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-faint)]">
                  {password.length >= 8 && <IconCheck width={12} height={12} className="text-[var(--good)]" />}
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-[var(--bad)]/35 bg-[var(--bad)]/10 px-4 py-3 text-sm font-semibold text-[var(--bad)]" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-primary btn-cta mt-1 w-full !justify-between !px-5" disabled={loading}>
            <span>{loading ? "Please wait…" : isSignup ? "Create my account" : "Sign in"}</span>
            {!loading && <IconChevronRight width={19} height={19} />}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[var(--accent)]">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-[var(--accent)]">
                Create an account
              </Link>
            </>
          )}
        </p>
        <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-faint)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          or
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <Link href="/play/bot" className="btn w-full !py-3 text-sm">
          Keep playing as a guest
        </Link>
        <p className="mt-4 text-center text-[11px] leading-5 text-[var(--text-faint)]">
          No payment details. Your email is used only for your Sam&apos;s Arcade account.
        </p>
        </section>
      </div>
    </div>
  );
}
