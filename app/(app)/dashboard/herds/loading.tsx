import { Skeleton } from "@/components/ui/skeleton";

export default function HerdsLoading() {
  return (
    <div>
      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-lowest rounded-2xl p-5">
            <Skeleton className="mx-auto mb-2 h-3 w-20" />
            <Skeleton className="mx-auto h-6 w-28" />
          </div>
        ))}
      </div>

      {/* Toolbar pill */}
      <div className="bg-surface-lowest mb-4 flex items-center justify-between rounded-full border border-white/[0.08] px-2 py-2">
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

      {/* Sort-bar pill */}
      <div className="bg-surface-lowest mb-3 rounded-full border border-white/[0.08] px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-14 rounded-full" />
          ))}
        </div>
      </div>

      {/* Property group */}
      <div>
        <div className="mb-2 flex items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-3 w-40" />
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <HerdCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HerdCardSkeleton() {
  return (
    <div className="bg-surface-lowest overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 bg-white/[0.04] px-4 py-2.5">
        <Skeleton className="h-9 w-12 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <Skeleton className="ml-3 h-5 w-24" />
      </div>
      <div className="px-4 py-2">
        <div className="grid grid-cols-4 gap-x-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-1 h-2.5 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-x-3 border-t border-white/[0.04] pt-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-1 h-2.5 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
