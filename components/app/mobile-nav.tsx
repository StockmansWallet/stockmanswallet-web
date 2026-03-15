"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { useViewMode } from "@/lib/hooks/use-view-mode";
import { ViewModeToggle } from "@/components/app/view-mode-toggle";
import { Menu, X, Crown, HelpCircle, Settings, LogOut } from "lucide-react";
import { tierDisplayName, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { NotificationBell } from "@/components/app/notification-bell";
import {
  farmerMobileItems,
  advisorMobileItems,
  type NavItem,
} from "@/lib/navigation/nav-config";

export function MobileNav({ userEmail, subscriptionTier = "stockman" }: { userEmail?: string; subscriptionTier?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { viewMode } = useViewMode();

  const checkActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  const navItems: NavItem[] = viewMode === "farmer" ? farmerMobileItems : advisorMobileItems;

  return (
    <>
      {/* Mobile header */}
      <header className="flex items-center justify-between bg-bg-alt px-4 py-3 lg:hidden">
        <Link href="/dashboard">
          <Image
            src="/images/sw-logo.svg"
            alt="Stockman's Wallet"
            width={140}
            height={90}
            className="opacity-90"
          />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setOpen(!open)}
            className="rounded-xl p-2 text-text-secondary hover:bg-white/8"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-0 flex h-full w-72 flex-col bg-bg-alt p-4 shadow-2xl">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-text-secondary hover:bg-white/8"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* View mode toggle */}
            <ViewModeToggle />

            <div className="flex-1 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    checkActive(item.href)
                      ? (item.activeClass ?? "bg-brand/15 text-brand")
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-white/5 pt-3">
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:bg-white/5"
              >
                <Crown className="h-4 w-4 text-brand" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Plan</p>
                  <p className="text-xs text-text-muted">{tierDisplayName(subscriptionTier as SubscriptionTier)}</p>
                </div>
              </Link>

              <Link
                href="/dashboard/help"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary"
              >
                <HelpCircle className="h-4 w-4" />
                Help Center
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  checkActive("/dashboard/settings")
                    ? "bg-brand/15 text-brand"
                    : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>

              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
