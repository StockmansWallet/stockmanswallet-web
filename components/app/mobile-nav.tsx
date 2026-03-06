"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import {
  Menu,
  X,
  Wallet,
  TrendingUp,
  BookOpen,
  FileText,
  Truck,
  Grid3x3,
  Users,
  Crown,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";
import { IconFarm } from "@/components/icons/icon-farm";
import { IconStockmanIQ } from "@/components/icons/icon-stockmaniq";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: <Wallet className="h-5 w-5" /> },
  { label: "Herds", href: "/dashboard/herds", icon: <IconCattleTags className="h-5 w-5" /> },
  { label: "Properties", href: "/dashboard/properties", icon: <IconFarm className="h-5 w-5" /> },
  { label: "Stockman IQ", href: "/dashboard/stockman-iq", icon: <IconStockmanIQ className="h-5 w-5" /> },
  { label: "Markets", href: "/dashboard/market", icon: <TrendingUp className="h-5 w-5" /> },
  { label: "Yard Book", href: "/dashboard/tools/yard-book", icon: <BookOpen className="h-5 w-5" /> },
  { label: "Reports", href: "/dashboard/tools/reports", icon: <FileText className="h-5 w-5" /> },
  { label: "Freight IQ", href: "/dashboard/tools/freight", icon: <Truck className="h-5 w-5" /> },
  { label: "Grid IQ", href: "/dashboard/tools/grid-iq", icon: <Grid3x3 className="h-5 w-5" /> },
  { label: "Advisory Hub", href: "/dashboard/advisory-hub", icon: <Users className="h-5 w-5" /> },
];

export function MobileNav({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const checkActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <>
      {/* Mobile header */}
      <header className="flex items-center justify-between bg-bg-alt px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/images/sw-logo-tally.svg"
            alt="Stockman's Wallet"
            width={32}
            height={32}
            className="brightness-0 invert opacity-90"
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
          <nav className="absolute right-0 top-0 flex h-full w-72 flex-col bg-bg-alt p-4 shadow-2xl">
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-text-secondary hover:bg-white/8"
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
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
                    checkActive(item.href)
                      ? "bg-brand/15 text-brand"
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
                className="mb-1 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all hover:bg-white/5"
              >
                <Crown className="h-4 w-4 text-brand" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Plan</p>
                  <p className="text-xs text-text-muted">Head Stockman</p>
                </div>
              </Link>

              <Link
                href="/dashboard/help"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary"
              >
                <HelpCircle className="h-4 w-4" />
                Help Center
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all ${
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
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary"
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
