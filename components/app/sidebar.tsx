"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { SidebarBadge } from "@/components/app/sidebar-badge";
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
  const inactiveBase = "text-text-secondary";
  const inactive =
    item.inactiveClass ??
    `${inactiveBase} ${item.hoverClass ?? "hover:bg-brand-dark hover:text-white"}`;
  const active = item.activeClass ?? "bg-brand/15 text-brand backdrop-blur-sm";

  return (
    <Link
      href={item.href}
      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        isActive ? active : inactive
      }`}
    >
      {item.icon}
      <span>{item.label}</span>
      {item.notificationTypes && item.notificationTypes.length > 0 && (
        <SidebarBadge types={item.notificationTypes} suppressPrefix={item.badgeSuppressPrefix} />
      )}
    </Link>
  );
}

interface SidebarProps {
  isAdmin?: boolean;
  isAdvisor?: boolean;
  isDemoUser?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  roleLabel?: string;
  avatarUrl?: string;
  subscriptionTier?: string;
}

export function Sidebar({
  isAdmin = false,
  isAdvisor = false,
  isDemoUser = false,
  firstName = "",
  lastName = "",
  email = "",
  roleLabel = "",
  avatarUrl = "",
}: SidebarProps) {
  const pathname = usePathname();

  const checkActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/dashboard" || href === "/dashboard/advisor") return false;
    return pathname.startsWith(href);
  };

  const mainItems = isAdvisor ? advisorNavItems : producerNavItems;
  const intelItems = isAdvisor ? advisorIntelItems : producerIntelItems;
  const toolItems = isAdvisor ? advisorToolItems : producerToolItems;

  const initials =
    firstName && lastName ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() : "SW";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : email || "";

  return (
    <aside className="flex w-64 flex-col rounded-3xl bg-[#1F1B18]">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center justify-center gap-2.5 rounded-t-3xl px-4 pt-4 pb-1 transition-opacity hover:opacity-90"
      >
        <Image
          src="/images/sw-logo-tally.svg"
          alt="Stockman's Wallet"
          width={36}
          height={36}
          className="h-9 w-9"
          priority
        />
        <span className="text-base font-bold text-white">Stockman&apos;s Wallet</span>
      </Link>

      {/* Navigation groups */}
      <nav className="scrollbar-none px-3 pt-3 lg:px-4 lg:pt-4">
        <div className="space-y-3 lg:space-y-4">
          <div className="rounded-2xl bg-white/[0.04] p-2">
            <p className="text-text-muted/60 mb-1 px-3 pt-1 text-[10px] font-semibold tracking-widest uppercase">
              Portfolio
            </p>
            <div className="space-y-0.5">
              {mainItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] p-2">
            <p className="text-text-muted/60 mb-1 px-3 pt-1 text-[10px] font-semibold tracking-widest uppercase">
              Intelligence
            </p>
            <div className="space-y-0.5">
              {intelItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>
          </div>

          {toolItems.length > 0 && (
            <div className="rounded-2xl bg-white/[0.04] p-2">
              <p className="text-text-muted/60 mb-1 px-3 pt-1 text-[10px] font-semibold tracking-widest uppercase">
                Tools
              </p>
              <div className="space-y-0.5">
                {toolItems.map((item) => (
                  <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-2xl bg-white/[0.04] p-2">
              <p className="text-text-muted/60 mb-1 px-3 pt-1 text-[10px] font-semibold tracking-widest uppercase">
                Admin
              </p>
              <div className="space-y-0.5">
                {adminItems.map((item) => (
                  <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white/[0.04] p-2">
            <div className="space-y-0.5">
              {bottomNavItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
              {isDemoUser && (
                <NavLink
                  item={{
                    label: "Demo Guide",
                    href: "/dashboard/demo-guide",
                    icon: <Sparkles className="text-brand h-5 w-5" />,
                  }}
                  isActive={checkActive("/dashboard/demo-guide")}
                />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* User card - links to profile */}
      <div className="p-3 lg:p-4">
        <Link
          href="/dashboard/settings/profile"
          className="flex w-full items-center gap-2.5 rounded-xl bg-white/[0.04] p-2 transition-colors hover:bg-white/[0.06]"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="bg-brand/15 text-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <span className="text-sm font-bold">{initials}</span>
            </div>
          )}
          <div className="min-w-0 flex-1 text-left">
            <p className="text-text-primary truncate text-sm font-semibold">{displayName}</p>
            {roleLabel && <p className="text-text-muted truncate text-xs">{roleLabel}</p>}
          </div>
          <ChevronRight className="text-text-muted h-4 w-4 shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
