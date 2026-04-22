import Link from "next/link";
import Image from "next/image";
import PageBackground from "@/components/marketing/ui/page-background";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageBackground />
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
