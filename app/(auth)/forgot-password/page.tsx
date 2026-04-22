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
        <h1 className="text-text-primary mb-2 text-2xl font-bold">Check your email</h1>
        <p className="text-text-muted mb-6 text-sm">
          If an account exists for that email, a reset link has been sent. Check your inbox and spam
          folder.
        </p>
        <Link href="/sign-in" className="text-brand hover:text-brand-light text-sm font-medium">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-text-primary mb-1 text-center text-2xl font-bold">Forgot password?</h1>
      <p className="text-text-muted mb-6 text-center text-sm">
        Enter your email and we will send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-text-secondary mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="text-text-primary placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur-xl transition-all outline-none focus:ring-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-brand-dark hover:bg-brand w-full rounded-full px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-text-muted mt-6 text-center text-sm">
        <Link href="/sign-in" className="text-brand hover:text-brand-light font-medium">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
