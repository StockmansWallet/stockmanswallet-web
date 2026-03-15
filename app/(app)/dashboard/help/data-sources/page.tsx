import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Database, TrendingUp, Cloud, Scale } from "lucide-react";

export const metadata = {
  title: "Data Sources",
};

const sources = [
  {
    title: "MLA (Meat & Livestock Australia)",
    description:
      "Saleyard prices, national averages, and category breakdowns are sourced from MLA market reports. Data is updated after each sale day and covers cattle, sheep, and goat categories across Australian saleyards.",
    icon: <TrendingUp className="h-5 w-5" />,
    link: "https://www.mla.com.au",
  },
  {
    title: "Open-Meteo Weather API",
    description:
      "Weather data including current conditions, temperature, rainfall, and 3-day forecasts are provided by Open-Meteo. Location is based on your primary property coordinates.",
    icon: <Cloud className="h-5 w-5" />,
    link: "https://open-meteo.com",
  },
  {
    title: "Breed Premiums",
    description:
      "Breed premium and discount percentages are maintained by the Stockman's Wallet team based on industry benchmarks and market analysis. These are applied on top of base MLA category prices.",
    icon: <Scale className="h-5 w-5" />,
  },
  {
    title: "Freight Rates",
    description:
      "Freight cost estimates use distance-based calculations with rate tables for different load types (B-double, semi, rigid). Rates are periodically updated based on industry averages.",
    icon: <Database className="h-5 w-5" />,
  },
];

export default function DataSourcesPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Data Sources"
        titleHref="/dashboard/help"
        subtitle="Back to Help Center"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      <p className="mb-6 text-sm text-text-muted">
        Stockman&apos;s Wallet uses the following data sources to power valuations,
        market prices, and other features.
      </p>

      <div className="space-y-3">
        {sources.map((source) => (
          <Card key={source.title}>
            <CardContent className="px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                  {source.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {source.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {source.description}
                  </p>
                  {source.link && (
                    <a
                      href={source.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-xs font-medium text-brand hover:underline"
                    >
                      Visit website
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
