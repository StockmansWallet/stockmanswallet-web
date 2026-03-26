import Image from "next/image";
import Link from "next/link";

export default function VerifiedPage() {
  return (
    <>
      <div className="flex justify-center mb-4">
        <div className="relative">
          <Image
            src="/images/Brangus-wave.webp"
            alt="Brangus"
            width={120}
            height={120}
            className="rounded-2xl"
            priority
          />
          <div className="absolute -bottom-1 -right-1 rounded-full bg-green-500 p-1">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
        </div>
      </div>

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
