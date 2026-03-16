import { TrendingUp, Leaf, CircleDollarSign, FileText } from "lucide-react";

const features = [
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Track Portfolio Value",
    subtitle: "Real-time livestock valuations powered by live market data",
  },
  {
    icon: <Leaf className="h-5 w-5" />,
    title: "Monitor Your Herds",
    subtitle: "Growth tracking, mortality rates and herd movements",
  },
  {
    icon: <CircleDollarSign className="h-5 w-5" />,
    title: "Market Intelligence",
    subtitle: "Live saleyard prices across Australian markets",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Reports & Insights",
    subtitle: "Financial and operational data at your fingertips",
  },
];

export function StepWelcome() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-text-muted">Welcome to</p>
        <h2 className="text-2xl font-bold text-text-primary">
          Stockman&apos;s Wallet
        </h2>
      </div>

      <div className="space-y-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-lg px-1 py-1.5"
          >
            <div className="mt-0.5 flex-shrink-0 text-brand">{f.icon}</div>
            <div>
              <p className="text-sm font-medium text-text-primary">{f.title}</p>
              <p className="text-xs text-text-muted">{f.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
