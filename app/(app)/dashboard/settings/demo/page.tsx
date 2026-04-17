import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, FlaskConical } from "lucide-react";
import { LoadDemoButton, ClearDataButton } from "../demo-buttons";

export const metadata = { title: "Demo Data - Settings" };

export default function DemoDataPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
      <PageHeader
        title="Demo Data"
        titleClassName="text-4xl font-bold text-lime-400"
        subtitle="Load sample herds to explore the app without entering real data."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-500/15">
                <FlaskConical className="h-3.5 w-3.5 text-lime-400" />
              </div>
              <div>
                <CardTitle>Doongara Station</CardTitle>
                <p className="mt-1 text-xs text-text-muted">
                  Central Queensland cattle operation demo dataset.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                Loads 20 herds and a property from the demo dataset. Replaces any existing demo data.
                Your real data is unaffected.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <LoadDemoButton />
                <ClearDataButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
