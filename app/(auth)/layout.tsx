import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        aria-hidden
        className="bg-background pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage: [
            "linear-gradient(to bottom, rgba(31,27,24,0) 0%, rgba(31,27,24,0.35) 25%, rgba(31,27,24,0.7) 55%, rgba(31,27,24,1) 90%)",
            "radial-gradient(ellipse 2200px 2200px at -500px -500px, rgba(217,118,47,0.12) 0%, transparent 70%)",
            "linear-gradient(rgba(31,27,24,0.78), rgba(31,27,24,0.78)), url('/images/landing-bg.webp')",
          ].join(","),
          backgroundSize: "100% 100%, 100% 100%, cover, cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mb-8">
          <Link href="/" className="flex flex-col items-center gap-3">
            <Image
              src="/images/sw-logo.svg"
              alt="Stockman's Wallet"
              width={200}
              height={132}
              priority
            />
          </Link>
        </div>
        <div className="w-full max-w-sm">{children}</div>
        <p className="text-text-muted mt-8 text-xs">
          &copy; {new Date().getFullYear()} Stockman&apos;s Wallet. All rights reserved.
        </p>
      </div>
    </>
  );
}
