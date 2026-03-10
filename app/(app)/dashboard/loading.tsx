import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl">
      {/* Page header */}
      <div className="mt-11 mb-8">
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
          {/* Portfolio Value Card */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <Skeleton className="mb-2 h-3 w-28" />
            <Skeleton className="mb-2 h-10 w-52" />
            <Skeleton className="mb-4 h-4 w-20" />
            <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="mb-1 h-3 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>
          </div>

          {/* 12-Month Outlook chart */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-[240px] w-full rounded-lg" />
          </div>

          {/* Herd Composition */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="mb-4 h-3 w-full rounded-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>

          {/* Largest Herds */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <Skeleton className="mb-1 h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex w-full flex-col gap-3 lg:w-[340px] lg:gap-4">
          {/* User Profile Card */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div>
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <Skeleton className="mb-4 h-5 w-28" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.02] py-4">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>
          </div>

          {/* Coming Up */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <Skeleton className="mb-4 h-5 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>

          {/* Properties */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
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

          {/* Growth & Mortality */}
          <div className="rounded-2xl bg-white/[0.02] p-5">
            <Skeleton className="mb-4 h-5 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
