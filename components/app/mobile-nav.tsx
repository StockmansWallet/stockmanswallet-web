"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Menu, X } from "lucide-react";

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
      <header className="flex items-center justify-between bg-bg-alt px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/images/app-icon.png"
            alt="Stockman's Wallet"
            width={32}
            height={32}
            className="rounded-xl"
          />
          <span className="text-sm font-bold text-text-primary">
            Stockman&apos;s Wallet
          </span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-xl p-2 text-text-secondary hover:bg-white/8"
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-0 h-full w-72 bg-bg-alt p-4 shadow-2xl">
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-text-secondary hover:bg-white/8"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-0.5">
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
                    className={`block rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-brand/15 text-brand"
                        : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 pt-4">
              <div className="rounded-2xl bg-white/5 p-3">
                {userEmail && (
                  <p className="mb-2 truncate px-1 text-xs text-text-muted">
                    {userEmail}
                  </p>
                )}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded-xl px-2 py-2 text-left text-sm font-medium text-text-secondary hover:bg-white/8 hover:text-text-primary"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
