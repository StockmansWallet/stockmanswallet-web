import { Skeleton } from "@/components/ui/skeleton";

function SkeletonInfoCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-inset ring-white/8">
      <div className="px-5 pt-5 pb-4">
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="px-5 pb-5 divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HerdDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* PageHeader */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-44" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 rounded-2xl" />
          <Skeleton className="h-9 w-20 rounded-2xl" />
        </div>
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonInfoCard rows={6} />
        <SkeletonInfoCard rows={4} />
        <SkeletonInfoCard rows={4} />
        <SkeletonInfoCard rows={4} />
      </div>
    </div>
  );
}
