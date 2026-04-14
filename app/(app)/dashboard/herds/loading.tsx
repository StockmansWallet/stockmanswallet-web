import { Skeleton } from "@/components/ui/skeleton";

export default function HerdsLoading() {
  return (
    <div className="max-w-4xl">
      {/* PageHeader */}
      <div className="pb-4 pt-6">
        <Skeleton className="mb-2 h-9 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-lowest p-5">
            <Skeleton className="mx-auto mb-2 h-3 w-20" />
            <Skeleton className="mx-auto h-6 w-28" />
          </div>
        ))}
      </div>

      {/* Toolbar pill */}
      <div className="mb-4 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-surface-lowest">
        {/* Sort bar */}
        <div className="flex items-center gap-1 px-5 py-2.5">
          <Skeleton className="h-3 w-8" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-14 rounded-full" />
          ))}
        </div>
        {/* Property header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5 last:border-0">
            <Skeleton className="h-4 w-10" />
            <div className="flex-1">
              <Skeleton className="mb-1 h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
        {/* Footer */}
        <div className="border-t border-border-subtle px-5 py-3">
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
