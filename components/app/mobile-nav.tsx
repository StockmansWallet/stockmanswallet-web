"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { clearOverlay } from "@/lib/demo-overlay";
import { Menu, X, Crown, HelpCircle, Settings, LogOut } from "lucide-react";
import { tierDisplayName, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { producerMobileItems, advisorMobileItems, type NavItem } from "@/lib/navigation/nav-config";

export function MobileNav({
  userEmail,
  subscriptionTier = "stockman",
  isAdvisor = false,
}: {
  userEmail?: string;
  subscriptionTier?: string;
  isAdvisor?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const checkActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const navItems: NavItem[] = isAdvisor ? advisorMobileItems : producerMobileItems;

  return (
    <>
      {/* Mobile header */}
      <header className="bg-bg-alt flex items-center justify-between px-4 py-3 lg:hidden">
        <Link href="/dashboard">
          <Image
            src="/images/sw-logo.svg"
            alt="Stockman's Wallet"
            width={140}
            height={90}
            className="opacity-90"
          />
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="text-text-secondary rounded-xl p-2 hover:bg-white/8"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <nav className="bg-bg-alt absolute top-0 right-0 flex h-full w-72 flex-col p-4 shadow-2xl">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="text-text-secondary rounded-xl p-2 hover:bg-white/8"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    checkActive(item.href)
                      ? (item.activeClass ?? "bg-brand/15 text-brand")
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-white/5 pt-3">
              <Link
                href="/dashboard/settings/account"
                onClick={() => setOpen(false)}
                className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:bg-white/5"
              >
                <Crown className="text-brand h-4 w-4" />
                <div>
                  <p className="text-text-primary text-sm font-medium">Plan</p>
                  <p className="text-text-muted text-xs">
                    {tierDisplayName(subscriptionTier as SubscriptionTier)}
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/help"
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text-primary flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-white/5"
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
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>

              <form action={signOut} onSubmit={() => clearOverlay()} className="mt-2">
                <button
                  type="submit"
                  className="bg-red/10 text-red hover:bg-red/15 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
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
