import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the real page frame: header, stat strip, then a card grid. */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <span className="sr-only" role="status">
        Loading…
      </span>

      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-48 max-w-full bg-muted" />
          <Skeleton className="h-4 w-80 max-w-full bg-muted" />
        </div>
        <Skeleton className="h-9 w-44 rounded-md bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-xs lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-3 bg-card px-4 py-4 sm:px-5">
            <Skeleton className="h-4 w-24 bg-muted" />
            <Skeleton className="h-7 w-16 bg-muted" />
            <Skeleton className="h-3 w-28 max-w-full bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
            <Skeleton className="h-3 w-24 bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/5 bg-muted" />
              <Skeleton className="h-3 w-full bg-muted" />
              <Skeleton className="h-3 w-4/5 bg-muted" />
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <Skeleton className="h-6 w-28 rounded-full bg-muted" />
              <Skeleton className="h-5 w-16 rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
