"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import {
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
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    label: "Herds",
    href: "/dashboard/herds",
    icon: <IconCattleTags className="h-5 w-5" />,
  },
  {
    label: "Properties",
    href: "/dashboard/properties",
    icon: <IconFarm className="h-5 w-5" />,
  },
  {
    label: "Stockman IQ",
    href: "/dashboard/stockman-iq",
    icon: <IconStockmanIQ className="h-5 w-5" />,
  },
  {
    label: "Markets",
    href: "/dashboard/market",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    label: "Yard Book",
    href: "/dashboard/tools/yard-book",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: "Reports",
    href: "/dashboard/tools/reports",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "Freight IQ",
    href: "/dashboard/tools/freight",
    icon: <Truck className="h-5 w-5" />,
  },
  {
    label: "Grid IQ",
    href: "/dashboard/tools/grid-iq",
    icon: <Grid3x3 className="h-5 w-5" />,
  },
  {
    label: "Advisory Hub",
    href: "/dashboard/advisory-hub",
    icon: <Users className="h-5 w-5" />,
  },
];

const bottomNavItems = [
  {
    label: "Help Center",
    href: "/dashboard/help",
    icon: <HelpCircle className="h-4 w-4" />,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  const checkActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <aside className="flex h-screen w-64 flex-col bg-bg-alt">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <Image
          src="/images/sw-logo-tally.svg"
          alt="Stockman's Wallet"
          width={36}
          height={36}
          className="brightness-0 invert opacity-90"
        />
        <span className="text-sm font-bold text-text-primary">
          Stockman&apos;s Wallet
        </span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              checkActive(item.href)
                ? "bg-brand/15 text-brand"
                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/5 px-3 py-3">
        {/* Plan indicator */}
        <Link
          href="/dashboard/settings"
          className="mb-1 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all hover:bg-white/5"
        >
          <Crown className="h-4 w-4 text-brand" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">Plan</p>
            <p className="text-xs text-text-muted">Head Stockman</p>
          </div>
        </Link>

        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
              checkActive(item.href)
                ? "bg-brand/15 text-brand"
                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </form>
      </div>
    </aside>
  );
}
