import { Skeleton } from "@/components/ui/skeleton";

export default function PropertiesLoading() {
  return (
    <div className="max-w-6xl">
      {/* PageHeader */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>

      {/* Property cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white/5 p-5">
            <div className="mb-3 flex items-start justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="mb-1 h-3 w-28" />
            <Skeleton className="mb-1 h-3 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
