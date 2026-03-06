import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, BarChart3, Scale, FileText, ChevronRight } from "lucide-react";

export const metadata = { title: "Reports" };

const reports = [
  {
    name: "Asset Register",
    description: "Complete herd listing with current valuations for accounting purposes.",
    href: "/dashboard/tools/reports/asset-register",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    name: "Sales Summary",
    description: "Transaction history, performance metrics, and revenue breakdown.",
    href: "/dashboard/tools/reports/sales-summary",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    name: "Saleyard Comparison",
    description: "Compare prices across saleyards to find the best market for your cattle.",
    href: "/dashboard/tools/reports/saleyard-comparison",
    icon: <Scale className="h-5 w-5" />,
  },
  {
    name: "Accountant Report",
    description: "Professional summary report suitable for your accountant or bank manager.",
    href: "/dashboard/tools/reports/accountant",
    icon: <FileText className="h-5 w-5" />,
  },
];

export default function ReportsPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Reports" subtitle="Generate and export reports for your operation." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {reports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="group h-full transition-all hover:bg-white/[0.07]">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  {report.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text-primary">{report.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{report.description}</p>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
