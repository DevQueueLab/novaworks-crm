import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the task page: breadcrumb, title and controls, discussion, details panel. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading…
      </span>

      <Skeleton className="h-4 w-72 max-w-full bg-muted" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-10">
        <div className="min-w-0 space-y-10">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4 bg-muted" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-36 bg-muted" />
              <Skeleton className="h-8 w-20 bg-muted" />
            </div>
          </div>

          <div className="space-y-2.5">
            <Skeleton className="h-4 w-24 bg-muted" />
            <Skeleton className="h-3 w-full bg-muted" />
            <Skeleton className="h-3 w-4/5 bg-muted" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-32 bg-muted" />
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full bg-muted" />
                <Skeleton className="h-20 flex-1 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        </div>

        <Skeleton className="h-96 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
