import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-bg-alt dark:border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/app-icon.png"
                alt="Stockman's Wallet"
                width={36}
                height={36}
                className="rounded-[8px]"
              />
              <span className="text-base font-semibold text-text-primary">
                Stockman&apos;s Wallet
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-text-secondary">
              Intelligent livestock valuation for Australian farmers, graziers
              and rural advisors. Track your herds as financial assets.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Product</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="#features"
                  className="text-sm text-text-secondary transition-colors hover:text-brand"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-sm text-text-secondary transition-colors hover:text-brand"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <a
                  href="#waitlist"
                  className="text-sm text-text-secondary transition-colors hover:text-brand"
                >
                  Join Waitlist
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Contact</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="mailto:info@stockmanswallet.com.au"
                  className="text-sm text-text-secondary transition-colors hover:text-brand"
                >
                  info@stockmanswallet.com.au
                </a>
              </li>
              <li>
                <Link
                  href="#about"
                  className="text-sm text-text-secondary transition-colors hover:text-brand"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-6 dark:border-white/10 md:flex-row">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Stockman&apos;s Wallet Pty Ltd.
            All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
