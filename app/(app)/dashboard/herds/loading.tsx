import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function HerdsLoading() {
  return (
    <div className="max-w-6xl">
      {/* PageHeader */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white/5">
        {/* Table header */}
        <div className="flex gap-4 border-b border-white/5 px-5 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-white/5 px-5 py-4 last:border-0">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
