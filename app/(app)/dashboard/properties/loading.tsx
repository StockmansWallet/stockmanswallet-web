import { Skeleton } from "@/components/ui/skeleton";

export default function PropertiesLoading() {
  return (
    <div>
      {/* Stat cards (3 cols) */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-lowest rounded-2xl p-5">
            <Skeleton className="mx-auto mb-2 h-3 w-20" />
            <Skeleton className="mx-auto h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Toolbar pill */}
      <div className="bg-surface-lowest mb-4 flex items-center justify-between rounded-full border border-white/[0.08] px-2 py-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>

      {/* Property list */}
      <div className="bg-surface-lowest overflow-hidden rounded-2xl border border-white/[0.08]">
        <div className="divide-y divide-white/[0.06]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
        <div className="border-border-subtle border-t px-5 py-3">
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}
