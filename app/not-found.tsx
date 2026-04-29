import LandingButton from "@/components/marketing/ui/landing-button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center px-4 py-24">
      <div className="relative mx-auto max-w-xl text-center">
        <p className="text-brand text-sm font-semibold tracking-wider uppercase">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-balance text-white sm:text-5xl">
          We couldn&apos;t find that paddock.
        </h1>
        <p className="text-text-secondary mt-4 text-base">
          The page you&apos;re after has wandered off. Let&apos;s get you back to the homestead.
        </p>
        <div className="mt-10 flex justify-center">
          <LandingButton href="/" size="md">
            Back to Stockman&apos;s Wallet
          </LandingButton>
        </div>
      </div>
    </main>
  );
}
