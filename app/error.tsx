"use client";

import { useEffect } from "react";
import LandingButton from "@/components/marketing/ui/landing-button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center px-4 py-24">
      <div className="relative mx-auto max-w-xl text-center">
        <p className="text-brand text-sm font-semibold tracking-wider uppercase">Something went wrong</p>
        <h1 className="mt-3 text-4xl font-semibold text-balance text-white sm:text-5xl">
          The yard gate stuck.
        </h1>
        <p className="text-text-secondary mt-4 text-base">
          We hit an unexpected error loading this page. Try again, or head back to the homepage.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LandingButton onClick={reset} size="md">
            Try again
          </LandingButton>
          <LandingButton href="/" size="md" variant="secondary">
            Back to homepage
          </LandingButton>
        </div>
        {error.digest && (
          <p className="text-text-muted mt-6 text-xs">Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
