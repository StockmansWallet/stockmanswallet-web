import { Skeleton } from "@/components/ui/skeleton";

function SkeletonInfoCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-white/5">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="px-5 pb-5 divide-y divide-white/5">
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
    <div className="max-w-6xl">
      {/* PageHeader */}
      <div className="flex items-end justify-between pb-4 pt-6">
        <div>
          <Skeleton className="mb-2 h-8 w-44" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>

      {/* Herd Value card */}
      <div className="mb-4 rounded-xl bg-white/5 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="mb-1 h-3 w-28" />
            <Skeleton className="mb-1 h-7 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonInfoCard rows={4} />
        <SkeletonInfoCard rows={7} />
        <SkeletonInfoCard rows={4} />
        <SkeletonInfoCard rows={3} />
        <SkeletonInfoCard rows={3} />
      </div>
    </div>
  );
}
