"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Grid3x3, BarChart3, TrendingUp } from "lucide-react";

const BASE = "/dashboard/tools/grid-iq";

const items = [
  {
    label: "New Analysis",
    href: `${BASE}/analyse`,
    icon: Target,
    matchPrefixes: [`${BASE}/analyse`],
  },
  {
    label: "Processor Records",
    href: `${BASE}/records`,
    icon: Grid3x3,
    matchPrefixes: [`${BASE}/records`, `${BASE}/grids`, `${BASE}/history`, `${BASE}/upload`],
  },
  {
    label: "Saved Analysis",
    href: `${BASE}/saved`,
    icon: BarChart3,
    matchPrefixes: [`${BASE}/saved`, `${BASE}/analyses`, `${BASE}/analysis`],
  },
  {
    label: "Historic Results",
    href: `${BASE}/performance`,
    icon: TrendingUp,
    matchPrefixes: [`${BASE}/performance`],
  },
];

export function GridIQSidebar() {
  const pathname = usePathname();

  function isActive(matchPrefixes: string[]) {
    return matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }

  return (
    <nav className="hidden w-48 shrink-0 sm:block">
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const active = isActive(item.matchPrefixes);
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
