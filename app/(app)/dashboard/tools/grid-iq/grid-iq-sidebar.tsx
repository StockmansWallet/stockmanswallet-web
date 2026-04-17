"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, ClipboardList, Library } from "lucide-react";

const BASE = "/dashboard/tools/grid-iq";

const items = [
  {
    label: "Analyse",
    href: `${BASE}/analyse`,
    icon: Target,
    matchPrefixes: [`${BASE}/analyse`],
  },
  {
    label: "Consignments",
    href: `${BASE}/consignments`,
    icon: ClipboardList,
    matchPrefixes: [`${BASE}/consignments`],
  },
  {
    label: "Library",
    href: `${BASE}/library`,
    icon: Library,
    matchPrefixes: [
      `${BASE}/library`,
      `${BASE}/grids`,
      `${BASE}/kill-sheets`,
      `${BASE}/analysis`,
      // Legacy prefixes, still covered while redirects remain in place
      `${BASE}/records`,
      `${BASE}/history`,
      `${BASE}/saved`,
      `${BASE}/analyses`,
      `${BASE}/performance`,
      `${BASE}/upload`,
    ],
  },
];

export function GridIQNav() {
  const pathname = usePathname();

  function isActive(matchPrefixes: string[]) {
    return matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }

  return (
    <nav className="mb-4 flex gap-1.5 overflow-x-auto">
      {items.map((item) => {
        const active = isActive(item.matchPrefixes);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
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
    </nav>
  );
}
