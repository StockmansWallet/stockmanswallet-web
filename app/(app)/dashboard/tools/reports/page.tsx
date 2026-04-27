import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, BarChart3, Scale, FileText, ChevronRight, Map, Building2 } from "lucide-react";

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
  {
    name: "Value vs Land Area",
    description: "Livestock value density per acre across your properties.",
    href: "/dashboard/tools/reports/value-vs-land-area",
    icon: <Map className="h-5 w-5" />,
  },
  {
    name: "Property vs Property",
    description: "Compare total value, head count, and average price across properties.",
    href: "/dashboard/tools/reports/property-comparison",
    icon: <Building2 className="h-5 w-5" />,
  },
];

export default function ReportsPage() {
  return (
    <div className="w-full max-w-[1680px]">
      <PageHeader feature="reports"
        title="Reports"
        titleClassName="text-4xl font-bold text-reports"
        subtitle="Generate and export reports"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {reports.map((report) => (
          <li key={report.href}>
          <Link href={report.href}>
            <Card className="group h-full transition-all hover:bg-white/[0.05]">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-reports/15 text-reports">
                  {report.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text-primary">{report.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{report.description}</p>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
              </CardContent>
            </Card>
          </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
