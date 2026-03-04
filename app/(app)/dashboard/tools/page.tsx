import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Package, FileBarChart, Grid3x3 } from "lucide-react";

export const metadata = {
  title: "Tools",
};

const tools = [
  {
    name: "Yard Book",
    description: "Your digital run sheet. Track tasks, health, breeding, and more.",
    href: "/dashboard/tools/yard-book",
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    name: "Freight IQ",
    description: "Calculate freight costs with deck loading and route costing.",
    href: "/dashboard/tools/freight",
    icon: <Package className="h-6 w-6" />,
  },
  {
    name: "Reports",
    description: "Generate asset registers, sales summaries, and accountant reports.",
    href: "/dashboard/tools/reports",
    icon: <FileBarChart className="h-6 w-6" />,
  },
  {
    name: "Grid IQ",
    description: "Analyse processor grids and kill sheets. Compare saleyard vs over-the-hooks.",
    href: "/dashboard/tools/grid-iq",
    icon: <Grid3x3 className="h-6 w-6" />,
  },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Tools"
        subtitle="Calculators and utilities for your operation."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {tool.name}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {tool.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
