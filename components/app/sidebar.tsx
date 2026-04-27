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
  subscriptionTier?: string;
}

export function Sidebar({
  isAdmin = false,
  isAdvisor = false,
  isDemoUser = false,
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
  const sectionClassName =
    "rounded-2xl border border-white/[0.08] bg-white/[0.07] bg-clip-padding p-2 backdrop-blur-xl [backface-visibility:hidden] [transform:translateZ(0)]";

  return (
    <aside className="flex w-64 flex-col">
      <nav className="scrollbar-none">
        <div className="space-y-3 lg:space-y-4">
          <div className={sectionClassName}>
            <p className="text-text-muted/60 mb-1 px-3 pt-1 text-[10px] font-semibold tracking-widest uppercase">
              Portfolio
            </p>
            <div className="space-y-0.5">
              {mainItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={checkActive(item.href)} />
              ))}
            </div>
          </div>

          <div className={sectionClassName}>
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
            <div className={sectionClassName}>
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
            <div className={sectionClassName}>
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

          <div className={sectionClassName}>
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
