"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Crown, LogOut } from "lucide-react";
import { SidebarBadge } from "@/components/app/sidebar-badge";
import { tierDisplayName, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import {
  producerNavItems,
  producerIntelItems,
  producerToolItems,
  advisorNavItems,
  advisorIntelItems,
  advisorToolItems,
  adminItems,
  bottomNavItems,
  type NavItem,
} from "@/lib/navigation/nav-config";

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      // Active items get backdrop-blur-xl so the tinted pill reads as the
      // same "frosted glass" material the cards and top bar use. Feature-
      // coloured overrides from nav-config.tsx (Brangus amber, Markets
      // green, Reports amber etc.) still apply on top.
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        isActive
          ? `backdrop-blur-xl ${item.activeClass ?? "bg-brand/15 text-brand"}`
          : (item.inactiveClass ?? "text-text-secondary hover:bg-white/5 hover:text-text-primary")
      }`}
    >
      {item.icon}
      <span>{item.label}</span>
      {item.notificationTypes && item.notificationTypes.length > 0 && (
        <SidebarBadge
          types={item.notificationTypes}
          suppressPrefix={item.badgeSuppressPrefix}
        />
      )}
    </Link>
  );
}

export function Sidebar({ isAdmin = false, subscriptionTier = "stockman", isAdvisor = false }: { isAdmin?: boolean; subscriptionTier?: string; isAdvisor?: boolean }) {
  const pathname = usePathname();

  const checkActive = (href: string) => {
    if (pathname === href) return true;
    // Avoid prefix collisions: /dashboard/advisor should not match /dashboard/advisor/clients
    if (href === "/dashboard" || href === "/dashboard/advisor") return false;
    return pathname.startsWith(href);
  };

  const mainItems = isAdvisor ? advisorNavItems : producerNavItems;
  const intelItems = isAdvisor ? advisorIntelItems : producerIntelItems;
  const toolItems = isAdvisor ? advisorToolItems : producerToolItems;

  return (
    <aside className="flex h-full w-64 flex-col">
      {/* Scrollable navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 pt-4">
        {/* Portfolio */}
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted/60">Portfolio</p>
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
          ))}
        </div>

        {/* Intelligence */}
        <div className="mx-0 mt-4 border-t border-white/5 pt-4">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted/60">Intelligence</p>
          <div className="space-y-0.5">
            {intelItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
            ))}
          </div>
        </div>

        {/* Tools */}
        {toolItems.length > 0 && (
          <div className="mx-0 mt-4 border-t border-white/5 pt-4">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted/60">Tools</p>
            <div className="space-y-0.5">
              {toolItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>
          </div>
        )}

        {/* Admin */}
        {isAdmin && (
          <div className="mx-0 mt-4 border-t border-white/5 pt-4">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted/60">Admin</p>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>
          </div>
        )}

        {/* Help & Settings. Per-feature badges on the nav items above
            (Producer Network, Yard Book) replaced the old aggregate
            Notifications entry. */}
        <div className="mt-4 border-t border-white/5 pt-4">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                checkActive(item.href)
                  ? "bg-brand/15 text-brand backdrop-blur-xl"
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
          href="/dashboard/settings/account"
          className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-white/5"
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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </form>
      </div>
    </aside>
  );
}
