"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "../actions";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await updatePassword(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Password updated</h1>
        <p className="text-sm text-text-muted">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-center text-2xl font-bold text-text-primary">
        Set new password
      </h1>
      <p className="mb-6 text-center text-sm text-text-muted">
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            placeholder="At least 12 characters"
            autoComplete="new-password"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
          />
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={12}
            maxLength={128}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
          />
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
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </>
  );
}
