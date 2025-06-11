
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 space-y-8 bg-background">
      <Skeleton className="h-16 w-1/2 rounded-lg" /> {/* Header Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        <div className="md:col-span-1 space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" /> {/* Filter Skeleton */}
        </div>
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-96 w-full rounded-lg" /> {/* Calendar Skeleton */}
        </div>
      </div>
    </div>
  );
}
