import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.first_name || "Stockman";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          G&apos;day, {firstName}
        </h1>
        <p className="text-sm text-text-muted">
          Here&apos;s your farm at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Portfolio Value" value="—" />
        <StatCard label="Total Head" value="—" />
        <StatCard label="Properties" value="—" />
        <StatCard label="Avg $/Head" value="—" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Portfolio placeholder */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-[#271F16]">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">
            Portfolio Overview
          </h2>
          <EmptyState
            title="No herds yet"
            description="Your portfolio will appear here once your herds are synced. Add herds from your iOS app or create them here."
            actionLabel="Add Herd"
            actionHref="/dashboard/portfolio"
          />
        </div>

        {/* Market snapshot placeholder */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-[#271F16]">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">
            Market Snapshot
          </h2>
          <EmptyState
            title="Market data loading"
            description="Live MLA cattle indicators and recent saleyard results will appear here."
          />
        </div>

        {/* Yard Book placeholder */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-[#271F16]">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">
            Yard Book
          </h2>
          <EmptyState
            title="No upcoming events"
            description="Your yard book events and reminders will show here."
            actionLabel="Open Yard Book"
            actionHref="/dashboard/tools"
          />
        </div>

        {/* Stockman IQ placeholder */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-[#271F16]">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">
            Stockman IQ Insights
          </h2>
          <EmptyState
            title="No insights yet"
            description="AI-powered insights about your herd performance and market opportunities will appear here."
            actionLabel="Chat with Brangus"
            actionHref="/dashboard/stockman-iq"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-[#271F16]">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
        <svg
          className="h-6 w-6 text-brand"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
          />
        </svg>
      </div>
      <h3 className="mb-1 text-sm font-medium text-text-primary">{title}</h3>
      <p className="max-w-xs text-xs text-text-muted">{description}</p>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-4 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
