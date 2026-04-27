import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  ChevronLeft,
  Cloud,
  Database,
  HardDrive,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { ClearAllDataButton } from "../data-management-buttons";

export const metadata = { title: "Data Management - Settings" };

function SectionIcon({
  icon: Icon,
  variant = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  variant?: "default" | "danger";
}) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
        variant === "danger" ? "bg-error/15" : "bg-brand/15"
      }`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${
          variant === "danger" ? "text-error" : "text-brand"
        }`}
      />
    </div>
  );
}

export default function DataManagementPage() {
  return (
    <div className="w-full max-w-[1680px]">
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
        titleClassName="text-4xl font-bold text-warning"
        subtitle="Review storage and irreversible data actions."
      />

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Data Summary
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-warning/20 bg-warning/15 text-warning">
                  <Database className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-text-primary">Cloud synced</p>
                  <p className="text-sm text-text-muted">Your data follows your account.</p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <SummaryLine
                icon={Cloud}
                label="Cloud data"
                value="Herds, properties, records, reports"
              />
              <SummaryLine
                icon={Smartphone}
                label="Device sync"
                value="Web and iOS app"
              />
              <SummaryLine
                icon={HardDrive}
                label="Account"
                value="Kept active if data is cleared"
              />
              <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-text-muted">
                Clearing app data removes the operational records tied to your account, but does not
                delete the account itself.
              </p>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          <Card className="border-error/25 bg-error/[0.03]">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={ShieldAlert} variant="danger" />
                <div>
                  <CardTitle>Danger Zone</CardTitle>
                  <p className="mt-1 text-xs text-text-muted">
                    Permanent actions that affect your cloud data across devices.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="rounded-2xl border border-error/20 bg-error/[0.04] p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error/15">
                    <AlertTriangle className="h-4.5 w-4.5 text-error" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-error">Clear All Data</p>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                      Permanently deletes all your herds, records, and app data from the cloud. This
                      affects both this web app and the iOS app. Your account will remain active.
                    </p>
                  </div>
                </div>
                <ClearAllDataButton />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Database} />
                <div>
                  <CardTitle>What stays</CardTitle>
                  <p className="mt-1 text-xs text-text-muted">
                    Account access is separate from the operational data reset.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoTile label="Account login" value="Remains active" />
                <InfoTile label="Subscription status" value="Not changed here" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15">
        <Icon className="h-4 w-4 text-warning" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
