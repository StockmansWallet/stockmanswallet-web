"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp, resendConfirmation, signInWithApple, signInWithGoogle } from "../actions";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);

    if (result && "error" in result && result.error) {
      setError(result.error);
    } else if (result && "confirmationRequired" in result && result.email) {
      setConfirmationEmail(result.email);
    }
    setLoading(false);
  }

  async function handleResend() {
    if (!confirmationEmail || resending) return;
    setResending(true);
    const result = await resendConfirmation(confirmationEmail);
    if (!result || !("error" in result)) {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    }
    setResending(false);
  }

  // Verification screen after sign-up (covers layout header, just shows Brangus)
  if (confirmationEmail) {
    return (
      <div className="bg-background fixed inset-0 z-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-2 flex justify-center">
            <img
              src="/images/brangus-post.webp"
              alt="Brangus posting your verification"
              width={280}
              height={280}
              className="object-contain"
            />
          </div>

          <h1 className="text-text-primary mb-2 text-center text-2xl font-bold">
            You&apos;re almost there mate!
          </h1>
          <p className="text-text-primary mb-1 text-center text-sm font-semibold">
            I&apos;ve sent a verification link to
          </p>
          <p className="text-brand mb-6 text-center text-sm font-semibold">{confirmationEmail}</p>
          <p className="text-text-muted mb-8 text-center text-xs">
            Tap the link in your email then head back here and you&apos;ll be ready to go!
          </p>

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={resending || resendSuccess}
              className="border-brand/20 bg-brand/5 text-brand hover:bg-brand/10 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all disabled:opacity-60"
            >
              {resending
                ? "Sending..."
                : resendSuccess
                  ? "Verification email sent"
                  : "Resend verification email"}
            </button>

            <button
              onClick={() => {
                setConfirmationEmail(null);
                setError(null);
              }}
              className="text-text-muted w-full rounded-xl border border-black/10 px-4 py-3 text-sm font-medium transition-all hover:bg-white/5 dark:border-white/10"
            >
              Use a different email
            </button>
          </div>

          <p className="text-text-muted mt-6 text-center text-sm">
            Already verified?{" "}
            <Link href="/sign-in" className="text-brand hover:text-brand-light font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-text-muted mt-8 text-xs">
          &copy; {new Date().getFullYear()} Stockman&apos;s Wallet. All rights reserved.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-text-primary mb-1 text-center text-2xl font-bold">Create your account</h1>
      <p className="text-text-muted mb-6 text-center text-sm">
        Get started with Stockman&apos;s Wallet
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

        <div>
          <label htmlFor="password" className="text-text-secondary mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            placeholder="At least 12 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-text-primary placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur-xl transition-all outline-none focus:ring-2"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="text-text-secondary mb-1 block text-sm font-medium"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={12}
            maxLength={128}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="text-text-primary placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur-xl transition-all outline-none focus:ring-2"
          />
        </div>

        {error && (
          <p className="text-error rounded-lg border border-red-500/20 bg-red-900/20 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-brand-dark hover:bg-brand w-full rounded-full px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 border-t border-white/10" />
        <span className="text-text-muted text-xs">or</span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      <div className="space-y-3">
        <form action={signInWithApple}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90"
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
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/15"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </form>
      </div>

      <p className="text-text-muted mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand hover:text-brand-light font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}
