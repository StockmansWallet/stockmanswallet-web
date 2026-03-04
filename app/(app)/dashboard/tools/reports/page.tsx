import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export const metadata = { title: "Reports" };

const reports = [
  {
    name: "Asset Register",
    description: "Complete herd listing with current valuations for accounting purposes.",
    href: "/dashboard/tools/reports/asset-register",
  },
  {
    name: "Sales Summary",
    description: "Transaction history, performance metrics, and revenue breakdown.",
    href: "/dashboard/tools/reports/sales-summary",
  },
  {
    name: "Saleyard Comparison",
    description: "Compare prices across saleyards to find the best market for your cattle.",
    href: "/dashboard/tools/reports/saleyard-comparison",
  },
  {
    name: "Accountant Report",
    description: "Professional summary report suitable for your accountant or bank manager.",
    href: "/dashboard/tools/reports/accountant",
  },
];

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Reports" subtitle="Generate and export reports for your operation." />
      <div className="space-y-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{report.name}</h3>
                  <p className="mt-0.5 text-xs text-text-muted">{report.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
