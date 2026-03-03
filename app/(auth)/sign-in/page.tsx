"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "../actions";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
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

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-brand hover:text-brand-dark"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
