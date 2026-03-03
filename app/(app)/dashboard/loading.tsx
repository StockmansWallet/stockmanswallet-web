import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <div className="mb-8">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="mb-3 h-12 w-56" />
        <div className="flex gap-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Herd Composition */}
        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-inset ring-white/8">
          <Skeleton className="mb-5 h-5 w-36" />
          <Skeleton className="mb-5 h-3 w-full rounded-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Top Herds */}
        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-inset ring-white/8">
          <Skeleton className="mb-4 h-5 w-28" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div>
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Properties */}
        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-inset ring-white/8">
          <Skeleton className="mb-4 h-5 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div>
                <Skeleton className="mb-1 h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-inset ring-white/8">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] py-5">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
