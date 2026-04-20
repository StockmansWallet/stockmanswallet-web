"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, signInAsDemo, signInWithApple, signInWithGoogle } from "../actions";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debug: Demo sign-in is a Server Action that can't return values, so failures
  // redirect back here with ?error=demo-failed. Surface that message on mount.
  useEffect(() => {
    const code = searchParams.get("error");
    if (code === "demo-failed") setError("Couldn't start demo. Please try again.");
    else if (code === "demo-not-configured") setError("Demo account is not configured.");
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-center text-2xl font-bold text-text-primary">
        Welcome back
      </h1>
      <p className="mb-6 text-center text-sm text-text-muted">
        Sign in to your Stockman&apos;s Wallet account
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Your password"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
          />
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-xs font-medium text-brand hover:text-brand-dark">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-error dark:bg-red-900/20 dark:text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-text-muted">or</span>
        </div>
      </div>

      <div className="space-y-3">
        <form action={signInWithApple}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90"
          >
            <svg className="h-4 w-4" viewBox="0 0 17 20" fill="currentColor">
              <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.358-.037-.054-1.494-1.403-2.856-1.403-1.216 0-2.478.727-3.09.727-.646 0-1.616-.708-2.664-.69-1.37.02-2.634.798-3.34 2.026-1.424 2.468-.364 6.124 1.022 8.127.678.98 1.485 2.08 2.547 2.04 1.022-.041 1.408-.661 2.643-.661 1.216 0 1.562.661 2.623.64 1.1-.018 1.795-1 2.468-1.983.778-1.135 1.098-2.234 1.118-2.291-.025-.011-2.145-.824-2.168-3.269l-.209.095zm-2.034-6.008c.563-.683.943-1.631.84-2.576-.811.033-1.795.541-2.376 1.222-.522.603-.979 1.567-.855 2.492.905.07 1.829-.461 2.391-1.138z" />
            </svg>
            Continue with Apple
          </button>
        </form>

        <form action={signInWithGoogle}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-brand hover:text-brand-dark"
        >
          Sign up
        </Link>
      </p>

      <div className="mt-4 text-center">
        <form action={signInAsDemo}>
          <button
            type="submit"
            className="text-sm font-medium text-brand underline-offset-4 transition-colors hover:underline hover:text-brand-dark"
          >
            Try Demo
          </button>
        </form>
      </div>
    </>
  );
}
