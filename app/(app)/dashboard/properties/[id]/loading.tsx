import { Skeleton } from "@/components/ui/skeleton";

export default function PropertyDetailLoading() {
  return (
    <div className="max-w-4xl">
      {/* Property header */}
      <div className="mb-6 mt-6 flex items-end gap-4">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <div>
          <Skeleton className="mb-2 h-7 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Stats row (3 cols) */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-lowest p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div>
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form cards */}
      <div className="space-y-4">
        {/* Property Details card */}
        <div className="rounded-2xl bg-surface-lowest p-5">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        {/* Location card */}
        <div className="rounded-2xl bg-surface-lowest p-5">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Skeleton className="mb-2 h-3 w-28" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        {/* Notes card */}
        <div className="rounded-2xl bg-surface-lowest p-5">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
