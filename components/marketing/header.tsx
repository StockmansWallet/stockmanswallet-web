"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/marketing/constants";
import LandingButton from "@/components/marketing/ui/landing-button";
import { useWaitlist } from "@/components/marketing/ui/waitlist-provider";

export function Header() {
  const { openWaitlist } = useWaitlist();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className="fixed top-0 z-50 w-full transition-all duration-700 ease-in-out"
      style={
        scrolled
          ? {
              backgroundColor: "rgba(15, 12, 8, 0.35)",
              backdropFilter: "blur(24px) saturate(1.2)",
              WebkitBackdropFilter: "blur(24px) saturate(1.2)",
            }
          : undefined
      }
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/sw-logo-tally.svg"
            alt="Stockman's Wallet"
            width={44}
            height={44}
            className="h-11 w-11"
          />
          <span className="text-lg font-bold text-white sm:text-xl">Stockman&apos;s Wallet</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-secondary focus-visible:ring-brand rounded-[10px] px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 lg:flex">
          <LandingButton size="sm" onClick={openWaitlist}>
            Join Waitlist
          </LandingButton>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="text-text-secondary focus-visible:ring-brand flex h-11 w-11 items-center justify-center rounded-[10px] hover:bg-white/5 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="glass-strong absolute inset-x-0 top-16 border-t border-white/5 lg:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-text-secondary rounded-[10px] px-3 py-3 text-base font-medium transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-2 border-t border-white/5 pt-4">
              <LandingButton
                size="sm"
                className="w-full"
                onClick={() => {
                  setMobileOpen(false);
                  openWaitlist();
                }}
              >
                Join Waitlist
              </LandingButton>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
