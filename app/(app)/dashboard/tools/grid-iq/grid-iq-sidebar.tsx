"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LayoutDashboard, Target, ClipboardList, Library, Factory } from "lucide-react";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";

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
  return (
    <>
      <PageHeaderActionsPortal>
        <GridIQNavPills pendingConsignments={pendingConsignments} variant="header" />
      </PageHeaderActionsPortal>
      <GridIQNavPills pendingConsignments={pendingConsignments} variant="body" />
    </>
  );
}

function GridIQNavPills({
  pendingConsignments,
  variant,
}: {
  pendingConsignments: number;
  variant: "header" | "body";
}) {
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
    const next = {
      left: Math.round(linkRect.left - containerRect.left),
      width: Math.round(linkRect.width),
    };
    setIndicator((current) => {
      if (current.left === next.left && current.width === next.width) return current;
      return next;
    });
    setReady((current) => current || true);
  }, [activeHref]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure]);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const isHeader = variant === "header";

  return (
    <nav
      ref={containerRef}
      aria-label="Grid IQ sections"
      className={
        isHeader
          ? "relative hidden h-9 max-w-[680px] gap-1 overflow-x-auto rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1 backdrop-blur-xl lg:flex"
          : "relative mb-4 flex gap-1 overflow-x-auto rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1 backdrop-blur-xl lg:hidden"
      }
    >
      {activeHref && (
        <div
          className={`absolute top-1 bottom-1 rounded-full bg-grid-iq/15 ${
            ready ? "transition-all duration-250 ease-out" : ""
          }`}
          style={{ left: indicator.left, width: indicator.width }}
          aria-hidden="true"
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
            className={`focus-visible:ring-grid-iq/40 relative z-10 flex shrink-0 flex-1 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none ${
              active
                ? "text-grid-iq"
                : "text-text-muted hover:text-text-secondary"
            } ${isHeader ? "h-7 px-3 text-xs" : "px-4 py-2 text-sm"}`}
          >
            <Icon
              className={`h-4 w-4 ${active ? "text-grid-iq" : "text-text-muted"}`}
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
