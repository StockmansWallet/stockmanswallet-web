import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Market" };

const TABS = [
  { label: "Indicators", href: "/dashboard/market/indicators" },
  { label: "Market Pulse", href: "/dashboard/market/pulse" },
];

export default function MarketPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Market" subtitle="Live livestock market intelligence and price indicators." />

      <div className="mb-6 flex gap-1 border-b border-black/5 dark:border-white/5">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-primary"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-text-primary">{tab.label}</h3>
                <p className="mt-1 text-xs text-text-muted">
                  {tab.label === "Indicators"
                    ? "National livestock indicators, category pricing, and historical trends."
                    : "Physical sales reports and regional price comparisons."}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
