"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Wordmark } from "@/components/ui/Logo";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

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
    <div className="mx-auto flex max-w-sm flex-col px-4 py-14">
      <div className="mb-6 flex justify-center">
        <Wordmark size={34} />
      </div>
      <div className="panel p-6">
        <h1 className="text-xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {isSignup ? "Track your games, rating, and puzzles." : "Sign in to continue."}
        </p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <div>
            <label className="label mb-1 block">Email</label>
            <input
              className="input !font-sans"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {isSignup && (
            <div>
              <label className="label mb-1 block">Username</label>
              <input
                className="input !font-sans"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3–20 letters, numbers, _"
                required
              />
            </div>
          )}
          <div>
            <label className="label mb-1 block">Password</label>
            <input
              className="input !font-sans"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

          <button className="btn btn-primary mt-1 w-full !py-2.5" disabled={loading}>
            {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
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
      </div>
    </div>
  );
}
