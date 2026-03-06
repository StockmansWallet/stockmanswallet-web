import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { TrendingUp, Activity, ChevronRight } from "lucide-react";

export const metadata = { title: "Market" };

const sections = [
  {
    label: "Indicators",
    description: "National livestock indicators, category pricing, and historical trends.",
    href: "/dashboard/market/indicators",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    label: "Market Pulse",
    description: "Physical sales reports and regional price comparisons.",
    href: "/dashboard/market/pulse",
    icon: <Activity className="h-5 w-5" />,
  },
];

export default function MarketPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Market" subtitle="Live livestock market intelligence and price indicators." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="group h-full transition-all hover:bg-white/[0.07]">
              <div className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  {section.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text-primary">{section.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{section.description}</p>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
