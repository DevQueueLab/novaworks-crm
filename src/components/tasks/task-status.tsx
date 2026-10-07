import type { TaskStatus } from "@/db/schema";
import { TASK_STATUS_LABEL } from "@/lib/task-status";
import { cn } from "@/lib/utils";

/*
 * Status visuals shared by server and client components (no hooks here).
 * A ring that fills as work moves along the board, then a solid check when done.
 */

const tone: Record<TaskStatus, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-amber-500 dark:text-amber-400",
  in_review: "text-sky-600 dark:text-sky-400",
  done: "text-emerald-600 dark:text-emerald-400",
};

const filled: Record<TaskStatus, number> = { todo: 0, in_progress: 0.5, in_review: 0.75, done: 1 };

/** Pie radius drawn as a stroke as wide as the pie itself, so a dash length is a filled share. */
const PIE_RADIUS = 2.5;
const PIE_LENGTH = 2 * Math.PI * PIE_RADIUS;

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const share = filled[status];
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn("size-3.5 shrink-0", tone[status], className)}
    >
      {status === "done" ? (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M5 8.25 7 10.25 11 6"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-background"
          />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          {share > 0 && (
            <circle
              cx="8"
              cy="8"
              r={PIE_RADIUS}
              stroke="currentColor"
              strokeWidth={PIE_RADIUS * 2}
              strokeDasharray={`${share * PIE_LENGTH} ${PIE_LENGTH}`}
              transform="rotate(-90 8 8)"
            />
          )}
        </>
      )}
    </svg>
  );
}

/** Compact status pill for task rows. */
export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-background px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <StatusIcon status={status} className="size-3" />
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}
