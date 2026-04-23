import Link from "next/link";

export default function VerifiedPage() {
  return (
    <main className="fixed inset-0 z-10 overflow-y-auto">
      <div className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center justify-center px-5 py-10 sm:px-6 sm:py-14">
        <div className="w-full space-y-6 text-center sm:space-y-7">
          <div className="mx-auto w-full max-w-[16rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/Brangus-wave.webp"
              alt="Brangus giving a wave"
              className="h-auto w-full object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
            />
          </div>

          <div className="px-2">
            <h1 className="text-[clamp(2rem,6vw,3rem)] font-semibold tracking-tight text-white">
              You&apos;re all set, mate.
            </h1>
            <p className="mt-3 text-[clamp(1rem,3.2vw,1.28rem)] leading-relaxed text-white/72">
              Your email&apos;s verified and your account is good to go. Head back to the app or
              carry on here.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#4a4d40]/72 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-5">
            <div className="space-y-3">
              <a
                href="stockmanswallet://"
                className="bg-brand hover:bg-brand-dark flex min-h-16 w-full items-center justify-center rounded-[1.55rem] px-5 py-4 text-base font-semibold text-white transition-colors active:scale-[0.99]"
              >
                Open Stockman&apos;s Wallet
              </a>

              <Link
                href="/sign-in"
                className="flex min-h-16 w-full items-center justify-center rounded-[1.55rem] border border-white/14 bg-black/14 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-black/22 active:scale-[0.99]"
              >
                Continue on web instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
