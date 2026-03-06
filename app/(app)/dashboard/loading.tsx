import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Row 1: Greeting + Profile */}
        <div className="flex items-center gap-3">
          <div>
            <Skeleton className="mb-2 h-7 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="rounded-2xl bg-white/5 p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div>
              <Skeleton className="mb-1 h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>

        {/* Row 2: Portfolio Value + Quick Actions */}
        <div className="rounded-2xl bg-white/5 p-5">
          <Skeleton className="mb-2 h-3 w-28" />
          <Skeleton className="mb-2 h-10 w-52" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="rounded-2xl bg-white/5 p-5">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] py-4">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="mx-auto mb-1 h-6 w-12" />
                <Skeleton className="mx-auto h-3 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Chart + Coming Up */}
        <div className="rounded-2xl bg-white/5 p-6">
          <Skeleton className="mb-5 h-5 w-40" />
          <Skeleton className="h-[240px] w-full rounded-lg" />
        </div>
        <div className="rounded-2xl bg-white/5 p-6">
          <Skeleton className="mb-4 h-5 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>

        {/* Row 4: Herd Composition + Properties */}
        <div className="rounded-2xl bg-white/5 p-6">
          <Skeleton className="mb-5 h-5 w-36" />
          <Skeleton className="mb-5 h-3 w-full rounded-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white/5 p-6">
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
      </div>
    </div>
  );
}
