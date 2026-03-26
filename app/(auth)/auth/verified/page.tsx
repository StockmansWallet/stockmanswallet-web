import Link from "next/link";

export default function VerifiedPage() {
  return (
    <>
      <h1 className="mb-2 text-center text-2xl font-bold text-text-primary">
        You&apos;re all set, mate!
      </h1>
      <p className="mb-2 text-center text-sm text-text-muted">
        Your email&apos;s been verified and your account is good to go.
      </p>
      <p className="mb-8 text-center text-sm text-text-muted">
        Head back to the app and sign in. I&apos;ll be
        waiting to help you get your herds sorted.
      </p>

      <div className="space-y-3">
        <a
          href="stockmanswallet://"
          className="block w-full rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-brand-dark"
        >
          Open Stockman&apos;s Wallet
        </a>

        <Link
          href="/sign-in"
          className="block w-full rounded-xl border border-black/10 px-4 py-3 text-center text-sm font-medium text-text-muted transition-all hover:bg-white/5 dark:border-white/10"
        >
          Continue on web instead
        </Link>
      </div>
    </>
  );
}
