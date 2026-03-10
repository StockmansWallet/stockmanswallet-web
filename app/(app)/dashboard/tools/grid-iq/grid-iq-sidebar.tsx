"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus, Upload, Grid3x3, FileText, TrendingUp } from "lucide-react";

const createItems = [
  {
    label: "New Analysis",
    href: "/dashboard/tools/grid-iq/analyse",
    icon: Plus,
  },
  {
    label: "New Grid",
    href: "/dashboard/tools/grid-iq/upload?type=grid",
    icon: Upload,
    matchQuery: { key: "type", value: "grid" },
  },
  {
    label: "New Kill Sheet",
    href: "/dashboard/tools/grid-iq/upload?type=killsheet",
    icon: Upload,
    matchQuery: { key: "type", value: "killsheet" },
  },
];

const viewItems = [
  {
    label: "View Analyses",
    href: "/dashboard/tools/grid-iq/analyses",
    icon: TrendingUp,
    matchPrefix: "/dashboard/tools/grid-iq/analyses",
  },
  {
    label: "View Grids",
    href: "/dashboard/tools/grid-iq/grids",
    icon: Grid3x3,
    matchPrefix: "/dashboard/tools/grid-iq/grids",
  },
  {
    label: "View Kill Sheets",
    href: "/dashboard/tools/grid-iq/history",
    icon: FileText,
    matchPrefix: "/dashboard/tools/grid-iq/history",
  },
];

export function GridIQSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isActive(href: string, matchPrefix?: string, matchQuery?: { key: string; value: string }) {
    if (matchPrefix) return pathname.startsWith(matchPrefix);
    const base = href.split("?")[0];
    const pathMatches = pathname === base || pathname.startsWith(base + "/");
    if (matchQuery && pathMatches) {
      return (searchParams.get(matchQuery.key) ?? "grid") === matchQuery.value;
    }
    return pathMatches;
  }

  return (
    <nav className="hidden w-56 shrink-0 sm:block">
      <div className="flex flex-col gap-1.5">
        {createItems.map((item) => {
          const active = isActive(item.href, undefined, item.matchQuery);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-teal-500/15 text-teal-400"
                  : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-teal-400" : "text-text-muted"}`} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="my-3 border-t border-white/[0.06]" />

      <div className="flex flex-col gap-1.5">
        {viewItems.map((item) => {
          const active = isActive(item.href, item.matchPrefix);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-teal-500/15 text-teal-400"
                  : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-teal-400" : "text-text-muted"}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
