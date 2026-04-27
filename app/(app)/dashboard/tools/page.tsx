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
    iconBg: "bg-yard-book/15",
    iconText: "text-yard-book",
  },
  {
    name: "Freight IQ",
    description: "Calculate freight costs with deck loading and route costing.",
    href: "/dashboard/tools/freight",
    icon: <Package className="h-5 w-5" />,
    iconBg: "bg-freight-iq/15",
    iconText: "text-freight-iq",
  },
  {
    name: "Reports",
    description: "Generate asset registers, sales summaries, and accountant reports.",
    href: "/dashboard/tools/reports",
    icon: <FileBarChart className="h-5 w-5" />,
    iconBg: "bg-reports/15",
    iconText: "text-reports",
  },
  {
    name: "Grid IQ",
    description: "Analyse processor grids and kill sheets. Compare saleyard vs over-the-hooks.",
    href: "/dashboard/tools/grid-iq",
    icon: <Grid3x3 className="h-5 w-5" />,
    iconBg: "bg-grid-iq/15",
    iconText: "text-grid-iq",
  },
];

export default function ToolsPage() {
  return (
    <div className="w-full max-w-[1680px]">
      <PageHeader
        title="Tools"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Calculators and utilities for your operation."
      />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link href={tool.href}>
              <Card className="group h-full transition-all hover:bg-white/[0.07]">
                <div className="flex items-start gap-4 p-5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tool.iconBg} ${tool.iconText}`}
                  >
                    {tool.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-text-primary text-sm font-semibold">{tool.name}</h3>
                    <p className="text-text-muted mt-1 text-xs leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                  <ChevronRight className="text-text-muted group-hover:text-text-secondary mt-0.5 h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5" />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
