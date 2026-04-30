"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/marketing/constants";
import LandingButton from "@/components/marketing/ui/landing-button";
import { useWaitlist } from "@/components/marketing/ui/waitlist-provider";

export function Header() {
  const { openWaitlist } = useWaitlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

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

  useEffect(() => {
    const ids = NAV_LINKS.map((link) => link.href.replace(/^\/?#/, ""));
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("/#") || window.location.pathname !== "/") return;

    const id = href.slice(2);
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    setMobileOpen(false);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", href);
  }

  return (
    <>
      <header className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-[#17130f] py-2.5 shadow-sm shadow-black/15">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Stockman's Wallet"
            className="relative flex h-14 w-64 shrink-0 items-center justify-center overflow-visible px-3 transition-opacity hover:opacity-90"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-1/2 h-[27rem] w-[66rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-brand) 16%, transparent), color-mix(in srgb, var(--color-brand) 7%, transparent) 36%, color-mix(in srgb, var(--color-brand) 2%, transparent) 62%, transparent 82%)",
              }}
            />
            <Image
              src="/images/sw-logo.svg"
              alt="Stockman's Wallet"
              width={220}
              height={146}
              priority
              className="relative h-[3.35rem] w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2">
            {/* Desktop Nav */}
            <nav className="hidden items-center gap-2 lg:flex">
              {NAV_LINKS.map((link) => {
                const id = link.href.replace(/^\/?#/, "");
                const isActive = activeSection === id;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(event) => handleNavClick(event, link.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={`focus-visible:ring-brand inline-flex h-10 items-center rounded-full border px-4 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                      isActive
                        ? "border-brand/30 bg-brand/15 text-brand"
                        : "text-text-secondary hover:text-text-primary border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:block">
              <LandingButton size="md" onClick={openWaitlist}>
                Join Waitlist
              </LandingButton>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="text-text-secondary focus-visible:ring-brand flex h-11 w-11 items-center justify-center rounded-[10px] hover:bg-white/5 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-controls="marketing-mobile-menu"
              aria-expanded={mobileOpen}
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
        </div>
      </header>

      {/* Mobile Menu (sibling of header so backdrop-blur applies against page content) */}
      {mobileOpen && (
        <div
          id="marketing-mobile-menu"
          className="fixed inset-x-0 top-[4.875rem] z-40 border-b border-white/[0.08] bg-[#17130f]/75 shadow-lg shadow-black/30 backdrop-blur-2xl lg:hidden"
        >
          <nav className="flex flex-col gap-2 px-4 py-4">
            {NAV_LINKS.map((link) => {
              const id = link.href.replace(/^\/?#/, "");
              const isActive = activeSection === id;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(event) => {
                    setMobileOpen(false);
                    handleNavClick(event, link.href);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-base font-medium transition-colors ${
                    isActive
                      ? "border-brand/30 bg-brand/15 text-brand"
                      : "text-text-secondary hover:text-text-primary border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-2 border-t border-white/5 pt-4">
              <LandingButton
                size="md"
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
    </>
  );
}
