import { Skeleton } from "@/components/ui/skeleton";

export default function ValuationLoading() {
  return (
    <div className="max-w-[1600px]">
      {/* PageHeader */}
      <div className="mb-4">
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="space-y-4">
        {/* Summary strip */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-secondary px-4 py-3">
          <div className="flex items-baseline gap-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-6" />
          </div>
          <div className="h-4 w-px bg-white/[0.08]" />
          <div className="flex items-baseline gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="h-4 w-px bg-white/[0.08]" />
          <div className="flex items-baseline gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="h-4 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        </div>

        {/* Logic panel */}
        <Skeleton className="h-11 w-full rounded-xl" />

        {/* Tab switcher */}
        <Skeleton className="h-9 w-72 rounded-lg" />

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-surface-secondary">
          {/* Filters */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <Skeleton className="h-7 w-10 rounded-md" />
            <Skeleton className="h-7 w-14 rounded-md" />
            <Skeleton className="h-7 w-12 rounded-md" />
            <Skeleton className="ml-auto h-8 w-48 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          {/* Column headers */}
          <div className="flex gap-3 border-b border-white/[0.06] px-4 py-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-14" />
          </div>
          {/* Rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-5 w-14 rounded" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
