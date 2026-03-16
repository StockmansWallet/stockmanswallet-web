"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "../actions";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    await forgotPassword(formData);

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Check your email</h1>
        <p className="mb-6 text-sm text-text-muted">
          If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.
        </p>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-brand hover:text-brand-dark"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-center text-2xl font-bold text-text-primary">
        Forgot password?
      </h1>
      <p className="mb-6 text-center text-sm text-text-muted">
        Enter your email and we will send you a link to reset your password.
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link
          href="/sign-in"
          className="font-medium text-brand hover:text-brand-dark"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
