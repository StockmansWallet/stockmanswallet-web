import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, Database } from "lucide-react";
import { ClearAllDataButton } from "../demo-buttons";

export const metadata = { title: "Data Management - Settings" };

function SectionIcon({
  icon: Icon,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "danger";
}) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
        variant === "danger" ? "bg-red-500/15" : "bg-brand/15"
      }`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${
          variant === "danger" ? "text-red-400" : "text-brand"
        }`}
      />
    </div>
  );
}

export default function DataManagementPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
      <PageHeader
        title="Data Management"
        titleClassName="text-4xl font-bold text-amber-400"
        subtitle="Manage your data."
      />

      <div className="space-y-6">
        {/* Clear All Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Database} variant="danger" />
              <div>
                <CardTitle>Clear All Data</CardTitle>
                <p className="mt-1 text-xs text-text-muted">
                  Your data syncs automatically across all devices.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                Permanently deletes all your herds, records, and data from the cloud.
                Affects both this web app and the iOS app. Your account will remain active.
              </p>
              <div className="mt-3">
                <ClearAllDataButton />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
