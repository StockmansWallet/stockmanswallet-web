"use client";

import Link from "next/link";
import Image from "next/image";
import { ViewModeToggle } from "@/components/app/view-mode-toggle";

interface TopBarProps {
  showViewToggle?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export function TopBar({ showViewToggle, firstName, lastName, email }: TopBarProps) {
  const initials = firstName && lastName
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : "SW";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : email || "";

  return (
    <header className="hidden h-20 shrink-0 items-center justify-between border-b border-white/[0.04] bg-background/95 backdrop-blur-sm px-8 lg:flex">
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

      {/* Right section: toggle + user profile */}
      <div className="flex items-center gap-4">
        {showViewToggle && <ViewModeToggle />}

        <Link href="/dashboard/settings/account" className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.04]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
            <span className="text-xs font-bold">{initials}</span>
          </div>
          <span className="text-sm font-medium text-text-secondary">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
