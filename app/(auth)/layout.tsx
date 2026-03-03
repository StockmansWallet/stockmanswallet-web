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
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/app-icon.png"
            alt="Stockman's Wallet"
            width={48}
            height={48}
            className="rounded-xl"
          />
          <span className="text-xl font-bold text-text-primary">
            Stockman&apos;s Wallet
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
