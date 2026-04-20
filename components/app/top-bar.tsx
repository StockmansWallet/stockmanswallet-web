"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface TopBarProps {
  firstName?: string;
  lastName?: string;
  email?: string;
  roleLabel?: string;
  avatarUrl?: string;
}

// Pixels of scroll before the header switches from fully transparent to
// frosted-glass. Low enough that any intentional scroll triggers it, high
// enough that hairline touchpad jitter at the top doesn't flicker the
// effect.
const SCROLL_THRESHOLD_PX = 8;

export function TopBar({ firstName, lastName, email, roleLabel, avatarUrl }: TopBarProps) {
  const initials =
    firstName && lastName
      ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
      : "SW";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : email || "";

  // Transparent at top, frosted once the user scrolls. Matches the iOS
  // compact-large-title pattern where the navigation bar gains its chrome
  // as content slides underneath it.
  //
  // Despite (app)/layout setting overflow-y-auto on <main>, main never
  // actually scrolls because its height is uncapped (flex-1 inside a
  // min-h-screen parent); scrollHeight == clientHeight, so scrollTop stays
  // at 0. The window is the real scroll container - confirmed by
  // inspecting document.documentElement.scrollTop at runtime.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function update() {
      // Read both for robustness: some older browsers populate one or the
      // other depending on quirks mode / flex layout.
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setScrolled(y > SCROLL_THRESHOLD_PX);
    }

    update(); // initial read, in case the page loaded pre-scrolled
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`hidden h-20 shrink-0 items-center justify-between border-b px-8 transition-[background-color,backdrop-filter,border-color] duration-200 lg:flex ${
        scrolled
          ? "border-white/[0.04] bg-background/40 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <Image
          src="/images/sw-logo-tally.svg"
          alt="Stockman's Wallet"
          width={44}
          height={44}
          className="h-11 w-11"
        />
        <span className="text-xl font-bold text-white">Stockman&apos;s Wallet</span>
      </Link>

      {/* Right section: user profile. Per-feature badges on the sidebar
          (Producer Network, Yard Book) replace the old aggregate bell. */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/settings/profile"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.04]"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
              <span className="text-sm font-bold">{initials}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-secondary">{displayName}</p>
            {roleLabel && <p className="text-xs text-text-muted">{roleLabel}</p>}
          </div>
        </Link>
      </div>
    </header>
  );
}
