"use client";

import Link from "next/link";
import Image from "next/image";

interface TopBarProps {
  firstName?: string;
  lastName?: string;
  email?: string;
  roleLabel?: string;
  avatarUrl?: string;
}

export function TopBar({ firstName, lastName, email, roleLabel, avatarUrl }: TopBarProps) {
  const initials =
    firstName && lastName
      ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
      : "SW";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : email || "";

  return (
    <header
      // bg-surface-lowest + backdrop-blur-xl matches the exact "frosted
      // glass" material every Card and StatCard uses, so the top bar reads
      // as part of the same surface language rather than a separate chrome.
      className="hidden h-20 shrink-0 items-center justify-between border-b border-white/[0.04] bg-surface-lowest px-8 backdrop-blur-xl lg:flex"
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
