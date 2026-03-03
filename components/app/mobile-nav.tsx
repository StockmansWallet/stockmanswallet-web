"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Herds", href: "/dashboard/herds" },
  { label: "Market", href: "/dashboard/market" },
  { label: "Properties", href: "/dashboard/properties" },
  { label: "Stockman IQ", href: "/dashboard/stockman-iq" },
  { label: "Tools", href: "/dashboard/tools" },
  { label: "Settings", href: "/dashboard/settings" },
];

export function MobileNav({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile header */}
      <header className="flex items-center justify-between border-b border-black/5 bg-bg-alt px-4 py-3 lg:hidden dark:border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/images/app-icon.png"
            alt="Stockman's Wallet"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-sm font-bold text-text-primary">
            Stockman&apos;s Wallet
          </span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
        >
          {open ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-0 h-full w-64 bg-bg-alt p-4 shadow-xl dark:bg-[#271F16]">
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand/10 text-brand"
                        : "text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 border-t border-black/5 pt-4 dark:border-white/5">
              {userEmail && (
                <p className="mb-2 truncate px-3 text-xs text-text-muted">
                  {userEmail}
                </p>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
