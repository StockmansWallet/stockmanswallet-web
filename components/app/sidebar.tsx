"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { isAdminEmail } from "@/lib/data/admin";
import { useViewMode } from "@/lib/hooks/use-view-mode";
import { Bell, Crown, LogOut } from "lucide-react";
import { NotificationBadge } from "@/components/app/notification-badge";
import { tierDisplayName, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import {
  farmerNavItems,
  farmerToolItems,
  advisorNavItems,
  advisorToolItems,
  adminItems,
  bottomNavItems,
  type NavItem,
} from "@/lib/navigation/nav-config";

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        isActive
          ? (item.activeClass ?? "bg-brand/15 text-brand")
          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export function Sidebar({ userEmail, subscriptionTier = "stockman" }: { userEmail?: string; subscriptionTier?: string }) {
  const pathname = usePathname();
  const { viewMode } = useViewMode();

  const checkActive = (href: string) => {
    if (pathname === href) return true;
    // Avoid prefix collisions: /dashboard/advisor should not match /dashboard/advisor/clients
    if (href === "/dashboard" || href === "/dashboard/advisor") return false;
    return pathname.startsWith(href);
  };

  const mainItems = viewMode === "farmer" ? farmerNavItems : advisorNavItems;
  const toolItems = viewMode === "farmer" ? farmerToolItems : advisorToolItems;

  return (
    <aside className="flex h-full w-64 flex-col">
      {/* Scrollable navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 pt-4">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
          ))}
        </div>

        {/* Tools */}
        {toolItems.length > 0 && (
          <div className="mx-0 mt-4 border-t border-white/5 pt-4">
            <div className="space-y-0.5">
              {toolItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>
          </div>
        )}

        {/* Admin */}
        {isAdminEmail(userEmail) && (
          <div className="mx-0 mt-4 border-t border-white/5 pt-4">
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>

          </div>
        )}

        {/* Notifications + Help & Settings */}
        <div className="mt-4 border-t border-white/5 pt-4">
          <Link
            href="/dashboard/notifications"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
              checkActive("/dashboard/notifications")
                ? "bg-brand/15 text-brand"
                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            }`}
          >
            <div className="relative">
              <Bell className="h-4 w-4" />
              <NotificationBadge />
            </div>
            Notifications
          </Link>
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
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
      </nav>

      {/* Zone 3: Plan & Log Out */}
      <div className="shrink-0 border-t border-white/5 px-4 pt-4 pb-2">
        <Link
          href="/dashboard/settings"
          className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:bg-white/5"
        >
          <Crown className="h-4 w-4 text-brand" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">Plan</p>
            <p className="text-xs text-text-muted">{tierDisplayName(subscriptionTier as SubscriptionTier)}</p>
          </div>
        </Link>

        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </form>
      </div>
    </aside>
  );
}
