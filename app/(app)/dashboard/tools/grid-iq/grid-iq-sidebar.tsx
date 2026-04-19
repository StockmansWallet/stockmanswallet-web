"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutDashboard, Target, ClipboardList, Library, Factory } from "lucide-react";

const BASE = "/dashboard/tools/grid-iq";

const items = [
  {
    label: "Dashboard",
    href: BASE,
    icon: LayoutDashboard,
    matchPrefixes: [BASE],
    exact: true,
  },
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
    label: "Processors",
    href: `${BASE}/processors`,
    icon: Factory,
    matchPrefixes: [`${BASE}/processors`],
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
    ],
  },
];

interface GridIQNavProps {
  pendingConsignments?: number;
}

export function GridIQNav({ pendingConsignments = 0 }: GridIQNavProps = {}) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);

  const activeHref =
    items.find((item) =>
      item.matchPrefixes.some((p) =>
        item.exact ? pathname === p : pathname === p || pathname.startsWith(p + "/")
      )
    )?.href ?? null;

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || !activeHref) {
      setReady(false);
      return;
    }
    const link = linkRefs.current.get(activeHref);
    if (!link) return;
    const containerRect = container.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    setIndicator({
      left: linkRect.left - containerRect.left,
      width: linkRect.width,
    });
    setReady(true);
  }, [activeHref]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <nav
      ref={containerRef}
      className="relative mb-4 flex gap-1 overflow-x-auto rounded-full bg-surface p-1"
    >
      {activeHref && (
        <div
          className={`absolute top-1 bottom-1 rounded-full bg-surface-high shadow-sm ${
            ready ? "transition-all duration-250 ease-out" : ""
          }`}
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              if (el) linkRefs.current.set(item.href, el);
            }}
            className={`relative z-10 flex shrink-0 flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              active
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${active ? "text-teal" : "text-text-muted"}`}
            />
            {item.label}
            {item.label === "Dashboard" && pendingConsignments > 0 && (
              <span className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-warning/20 px-1.5 text-[10px] font-semibold text-warning">
                {pendingConsignments}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
