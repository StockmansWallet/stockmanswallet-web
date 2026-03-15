import { TrendingUp, Brain, BookOpen, FileText } from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";

const features = [
  { icon: <IconCattleTags className="h-4 w-4" />, label: "Herd tracking and valuation" },
  { icon: <TrendingUp className="h-4 w-4" />, label: "Live market prices from MLA" },
  { icon: <Brain className="h-4 w-4" />, label: "AI-powered insights" },
  { icon: <BookOpen className="h-4 w-4" />, label: "Yard Book task management" },
  { icon: <FileText className="h-4 w-4" />, label: "Reports and analytics" },
];

export function StepWelcome({ userName }: { userName: string }) {
  return (
    <div className="text-center">
      <div className="mb-4 text-4xl">&#x1f44b;</div>
      <h2 className="text-xl font-bold text-text-primary">
        Welcome{userName ? `, ${userName}` : ""}!
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Let&apos;s get your account set up. This will only take a minute.
      </p>

      <div className="mt-6 space-y-2.5">
        {features.map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-4 py-2.5 text-left"
          >
            <div className="flex-shrink-0 text-brand">{f.icon}</div>
            <span className="text-sm text-text-secondary">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
