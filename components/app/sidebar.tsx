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
  Brain,
  Crown,
  HelpCircle,
  Settings,
  MapPinned,
  LogOut,
} from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";

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
    icon: <MapPinned className="h-5 w-5" />,
  },
  {
    label: "Stockman IQ",
    href: "/dashboard/stockman-iq",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    label: "Markets",
    href: "/dashboard/market",
    icon: <TrendingUp className="h-5 w-5" />,
  },
];

const toolItems = [
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
    <aside className="flex max-h-[calc(100vh-2rem)] w-64 flex-col">
      {/* Logo */}
      <div className="flex justify-center px-5 pb-8 pt-6">
        <Image
          src="/images/sw-logo.svg"
          alt="Stockman's Wallet"
          width={150}
          height={100}
          className="opacity-90"
        />
      </div>

      {/* Main navigation */}
      <nav className="overflow-y-auto px-4">
        <div className="space-y-0.5">
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
        </div>

        {/* Tools */}
        <div className="mx-0 mt-4 border-t border-white/5 pt-4">
          <div className="space-y-0.5">
            {toolItems.map((item) => (
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
          </div>
        </div>
      </nav>

      {/* Help & Settings */}
      <div className="mx-4 mt-4 border-t border-white/5 px-0 pt-4">
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
      </div>

      {/* Plan & Log Out */}
      <div className="mx-4 mt-4 border-t border-white/5 px-0 pt-4 pb-2">
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
