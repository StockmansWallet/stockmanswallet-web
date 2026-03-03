"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#1F1B18]/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
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
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-text-secondary transition-colors hover:text-brand"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-text-secondary transition-colors hover:text-brand"
          >
            Pricing
          </Link>
          <Link
            href="#about"
            className="text-sm text-text-secondary transition-colors hover:text-brand"
          >
            About
          </Link>
          <Link
            href="#contact"
            className="text-sm text-text-secondary transition-colors hover:text-brand"
          >
            Contact
          </Link>
          <a
            href="#waitlist"
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            Join Waitlist
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6 text-text-primary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-black/5 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#1F1B18] md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="#features"
              className="text-sm text-text-secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-text-secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="#about"
              className="text-sm text-text-secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="#contact"
              className="text-sm text-text-secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <a
              href="#waitlist"
              className="inline-block rounded-full bg-brand px-5 py-2 text-center text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Join Waitlist
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
