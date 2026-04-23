import { Skeleton } from "@/components/ui/skeleton";

function SkeletonInfoCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-surface-lowest rounded-2xl">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="divide-y divide-white/[0.04] px-5 pb-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HerdDetailLoading() {
  return (
    <div>
      {/* Stat cards (5 cols) */}
      <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-5 lg:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface-lowest rounded-2xl p-5">
            <Skeleton className="mx-auto mb-2 h-3 w-16" />
            <Skeleton className="mx-auto h-6 w-20" />
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="bg-surface-lowest mt-3 flex items-center justify-between rounded-full px-2 py-2 lg:mt-4">
        <div className="flex items-center gap-1.5 pl-2">
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>

      {/* Info cards */}
      <div className="mt-3 flex flex-col gap-4 lg:mt-4">
        <SkeletonInfoCard rows={6} />
        <SkeletonInfoCard rows={3} />
        <SkeletonInfoCard rows={4} />
        <SkeletonInfoCard rows={3} />
        <SkeletonInfoCard rows={3} />
      </div>
    </div>
  );
}
