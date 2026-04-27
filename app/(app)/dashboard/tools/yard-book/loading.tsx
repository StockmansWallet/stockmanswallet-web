import { Skeleton } from "@/components/ui/skeleton";

export default function YardBookLoading() {
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

      {/* Category toolbar pill */}
      <div className="mb-4 flex items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding px-2 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* Horizon sections */}
      <div className="space-y-4">
        {[6, 3].map((count, section) => (
          <div key={section}>
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3"
                >
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="mb-1.5 h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
