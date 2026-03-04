"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import {
  Wallet,
  Tags,
  TrendingUp,
  Home,
  Brain,
  Wrench,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    label: "Herds",
    href: "/dashboard/herds",
    icon: <Tags className="h-5 w-5" />,
  },
  {
    label: "Market",
    href: "/dashboard/market",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    label: "Properties",
    href: "/dashboard/properties",
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: "Stockman IQ",
    href: "/dashboard/stockman-iq",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    label: "Tools",
    href: "/dashboard/tools",
    icon: <Wrench className="h-5 w-5" />,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col bg-bg-alt">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <Image
          src="/images/app-icon.png"
          alt="Stockman's Wallet"
          width={36}
          height={36}
          className="rounded-xl"
        />
        <span className="text-sm font-bold text-text-primary">
          Stockman&apos;s Wallet
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-brand/15 text-brand"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4">
        <div className="rounded-2xl bg-white/5 p-3">
          {userEmail && (
            <p className="mb-2 truncate px-1 text-xs text-text-muted">
              {userEmail}
            </p>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-white/8 hover:text-text-primary"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
