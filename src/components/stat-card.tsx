import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One bordered strip with hairline dividers between figures (gap-px over a
 * border-coloured surface), instead of a row of separate accent-tiled cards.
 * Pass column classes that divide the item count evenly at every breakpoint.
 */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-xs lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 flex-col bg-card px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 text-2xl leading-8 font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 min-w-0 truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
