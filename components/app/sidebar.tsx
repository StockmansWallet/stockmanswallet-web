"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
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
  // Active: feature tint + feature text + frosted-glass blur.
  // Hover (when not active): feature -dark fill + white text.
  // Both states pull from nav-config.tsx so every item stays in step.
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

export function Sidebar({
  isAdmin = false,
  isAdvisor = false,
  isDemoUser = false,
}: {
  isAdmin?: boolean;
  isAdvisor?: boolean;
  isDemoUser?: boolean;
}) {
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
      <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <div className="space-y-2">
          {/* Portfolio */}
          <div className="rounded-xl bg-white/[0.04] p-2 backdrop-blur-md">
            <p className="text-text-muted/60 mb-1 px-3 pt-1 text-[10px] font-semibold tracking-widest uppercase">
              Portfolio
            </p>
            <div className="space-y-0.5">
              {mainItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>
          </div>

          {/* Intelligence */}
          <div className="rounded-xl bg-white/[0.04] p-2 backdrop-blur-md">
            <p className="text-text-muted/60 mb-1 px-3 pt-1 text-[10px] font-semibold tracking-widest uppercase">
              Intelligence
            </p>
            <div className="space-y-0.5">
              {intelItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>
          </div>

          {/* Tools */}
          {toolItems.length > 0 && (
            <div className="rounded-xl bg-white/[0.04] p-2 backdrop-blur-md">
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

          {/* Admin */}
          {isAdmin && (
            <div className="rounded-xl bg-white/[0.04] p-2 backdrop-blur-md">
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

          {/* Help & Settings */}
          <div className="rounded-xl bg-white/[0.04] p-2 backdrop-blur-md">
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
    </aside>
  );
}
