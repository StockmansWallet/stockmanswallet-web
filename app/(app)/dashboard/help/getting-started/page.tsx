import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Home,
  Plus,
  TrendingUp,
  BarChart3,
  DollarSign,
  FileText,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";

export const metadata = {
  title: "Getting Started",
};

const steps = [
  {
    number: 1,
    title: "Set Up Your Property",
    description:
      "Add your property with a name, state, and location. This helps with weather data and regional pricing. Set your default saleyard for more accurate valuations.",
    icon: <Home className="h-5 w-5" />,
    href: "/dashboard/properties/new",
    actionLabel: "Add Property",
  },
  {
    number: 2,
    title: "Add Your Herds",
    description:
      "Create herd groups with breed, category, head count, and weights. Track daily weight gain and breeding programs for each group.",
    icon: <IconCattleTags className="h-5 w-5" />,
    href: "/dashboard/herds/new",
    actionLabel: "Add Herd",
  },
  {
    number: 3,
    title: "Track Valuations",
    description:
      "Your dashboard automatically calculates herd values using the latest MLA saleyard prices matched to your categories and weight ranges. Set preferred saleyards for local pricing.",
    icon: <TrendingUp className="h-5 w-5" />,
    href: "/dashboard",
    actionLabel: "View Dashboard",
  },
  {
    number: 4,
    title: "Monitor Markets",
    description:
      "Browse live saleyard prices, national averages, and category breakdowns. See market pulse data and price trends across saleyards.",
    icon: <BarChart3 className="h-5 w-5" />,
    href: "/dashboard/market",
    actionLabel: "View Markets",
  },
  {
    number: 5,
    title: "Record Sales",
    description:
      "When you sell stock, record the sale with pricing (per kg or per head), freight costs, and sale details. Partial and full sales are supported.",
    icon: <DollarSign className="h-5 w-5" />,
    href: "/dashboard/herds",
    actionLabel: "View Herds",
  },
  {
    number: 6,
    title: "Generate Reports",
    description:
      "Create asset registers, sales summaries, saleyard comparisons, and accountant-ready reports. Export and share with your advisors.",
    icon: <FileText className="h-5 w-5" />,
    href: "/dashboard/tools/reports",
    actionLabel: "View Reports",
  },
];

export default function GettingStartedPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Getting Started"
        titleHref="/dashboard/help"
        subtitle="Back to Help Center"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      <p className="mb-6 text-sm text-text-muted">
        Follow these steps to get the most out of Stockman&apos;s Wallet.
      </p>

      <div className="space-y-3">
        {steps.map((step) => (
          <Card key={step.number}>
            <CardContent className="px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/15">
                  <span className="text-sm font-bold text-brand">{step.number}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-text-muted">{step.icon}</div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                    {step.description}
                  </p>
                  <Link
                    href={step.href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    {step.actionLabel}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="px-5 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
            <div>
              <p className="text-sm font-medium text-text-primary">Need more help?</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Visit the{" "}
                <Link href="/dashboard/help" className="text-brand hover:underline">
                  Help Center
                </Link>{" "}
                for feature guides, FAQs, and support options. You can also ask{" "}
                <Link href="/dashboard/stockman-iq" className="text-brand hover:underline">
                  Stockman IQ
                </Link>{" "}
                for quick answers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
