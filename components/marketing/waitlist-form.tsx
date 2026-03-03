"use client";

import { useState } from "react";

export function WaitlistForm({ variant = "default" }: { variant?: "default" | "hero" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    // TODO: Wire up to Supabase waitlist table
    // For now, simulate a successful submission
    await new Promise((resolve) => setTimeout(resolve, 800));
    setStatus("success");
    setEmail("");
  }

  if (status === "success") {
    return (
      <div className={`flex items-center gap-2 ${variant === "hero" ? "justify-center" : ""}`}>
        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <p className="text-sm font-medium text-text-primary">
          You&apos;re on the list. We&apos;ll be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex w-full max-w-md gap-2 ${variant === "hero" ? "mx-auto" : ""}`}>
      <input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-full border border-black/10 bg-white px-5 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="shrink-0 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-dark disabled:opacity-60"
      >
        {status === "loading" ? "Joining..." : "Join Waitlist"}
      </button>
    </form>
  );
}
