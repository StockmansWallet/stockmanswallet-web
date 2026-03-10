import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl">
      {/* PageHeader */}
      <div className="mt-11 mb-8">
        <Skeleton className="mb-2 h-8 w-28" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="space-y-6">
        {/* Nav card */}
        <div className="overflow-hidden rounded-2xl bg-white/5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 border-b border-white/[0.04] px-4 py-3.5 last:border-0">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="mb-1.5 h-4 w-24" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
