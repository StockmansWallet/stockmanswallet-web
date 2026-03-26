import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Link href="/" className="flex flex-col items-center gap-3">
          <Image
            src="/images/sw-logo-tally.svg"
            alt="Stockman's Wallet"
            width={72}
            height={72}
            priority
          />
          <span className="text-lg font-bold tracking-widest text-text-primary uppercase">
            Stockman&apos;s
            <br />
            <span className="text-xs font-semibold tracking-[0.3em]">
              Wallet
            </span>
          </span>
        </Link>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-8 text-xs text-text-muted">
        &copy; {new Date().getFullYear()} Stockman&apos;s Wallet. All rights
        reserved.
      </p>
    </div>
  );
}
