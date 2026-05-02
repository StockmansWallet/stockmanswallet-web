"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/marketing/constants";

export function Footer() {
  const pathname = usePathname();
  const isLegalPage = pathname === "/privacy" || pathname === "/terms";
  const panelClassName = isLegalPage
    ? "relative bg-[#17130f] px-0 py-12"
    : "relative overflow-hidden rounded-t-[32px] border border-b-0 border-white/[0.10] bg-[#17130f] px-4 py-12 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] sm:px-8 lg:px-10 xl:px-12";

  return (
    <footer className={isLegalPage ? "relative bg-[#17130f]" : "relative"}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className={panelClassName}>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src="/images/sw-logo-tally.svg"
                  alt="Stockman's Wallet"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                <span className="text-lg font-bold text-white">Stockman&apos;s Wallet</span>
              </div>
              <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                Intelligent Livestock Valuation. Real market data, real-time herd valuations, and
                AI-powered capital timing intelligence for Australian producers.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-text-tertiary mb-4 text-sm font-semibold tracking-wider uppercase">
                Quick Links
              </h4>
              <nav className="flex flex-col gap-2">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-text-secondary text-sm transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-text-tertiary mb-4 text-sm font-semibold tracking-wider uppercase">
                Legal
              </h4>
              <nav className="flex flex-col gap-2">
                <Link
                  href="/privacy"
                  className="text-text-secondary text-sm transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-text-secondary text-sm transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </nav>
              <div className="mt-6">
                <a
                  href="mailto:hello@stockmanswallet.com.au"
                  className="text-text-secondary hover:text-brand text-sm transition-colors"
                >
                  hello@stockmanswallet.com.au
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
            <p className="text-text-tertiary text-xs">
              &copy; 2026 Stockman&apos;s Wallet Pty Ltd. All rights reserved.
            </p>
            <p className="text-text-tertiary text-xs">Made in Queensland, Australia.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
