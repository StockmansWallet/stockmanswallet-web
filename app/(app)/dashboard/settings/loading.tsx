import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl">
      {/* PageHeader */}
      <div className="mb-8">
        <Skeleton className="mb-2 h-8 w-28" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="space-y-6">
        {/* Profile card */}
        <div className="rounded-2xl bg-white/5">
          <div className="px-5 pt-5 pb-4">
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="mb-2 h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div>
                <Skeleton className="mb-2 h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
            <div>
              <Skeleton className="mb-2 h-3 w-16" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Password card */}
        <div className="rounded-2xl bg-white/5">
          <div className="px-5 pt-5 pb-4">
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="px-5 pb-5 space-y-4">
            <div>
              <Skeleton className="mb-2 h-3 w-28" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="mb-2 h-3 w-32" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Demo data card */}
        <div className="rounded-2xl bg-white/5 p-5">
          <Skeleton className="mb-1 h-4 w-44" />
          <Skeleton className="mb-4 h-3 w-72" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36 rounded-2xl" />
            <Skeleton className="h-10 w-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
