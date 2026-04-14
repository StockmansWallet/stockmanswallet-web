import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { BookOpen, Package, FileBarChart, Grid3x3, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Tools",
};

const tools = [
  {
    name: "Yard Book",
    description: "Your digital run sheet. Track tasks, health, breeding, and more.",
    href: "/dashboard/tools/yard-book",
    icon: <BookOpen className="h-5 w-5" />,
    iconBg: "bg-lime-500/15",
    iconText: "text-lime-400",
  },
  {
    name: "Freight IQ",
    description: "Calculate freight costs with deck loading and route costing.",
    href: "/dashboard/tools/freight",
    icon: <Package className="h-5 w-5" />,
    iconBg: "bg-sky-500/15",
    iconText: "text-sky-400",
  },
  {
    name: "Reports",
    description: "Generate asset registers, sales summaries, and accountant reports.",
    href: "/dashboard/tools/reports",
    icon: <FileBarChart className="h-5 w-5" />,
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-400",
  },
  {
    name: "Grid IQ",
    description: "Analyse processor grids and kill sheets. Compare saleyard vs over-the-hooks.",
    href: "/dashboard/tools/grid-iq",
    icon: <Grid3x3 className="h-5 w-5" />,
    iconBg: "bg-teal-500/15",
    iconText: "text-teal-400",
  },
];

export default function ToolsPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Tools"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Calculators and utilities for your operation."
      />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {tools.map((tool) => (
          <li key={tool.href}>
          <Link href={tool.href}>
            <Card className="group h-full transition-all hover:bg-white/[0.07]">
              <div className="flex items-start gap-4 p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tool.iconBg} ${tool.iconText}`}>
                  {tool.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {tool.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {tool.description}
                  </p>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
              </div>
            </Card>
          </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
