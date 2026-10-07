import type { TaskStatus } from "@/db/schema";

/** Board columns, in workflow order. Safe to import from client components. */
export const TASK_STATUSES = ["todo", "in_progress", "in_review", "done"] as const satisfies readonly TaskStatus[];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

export type { TaskStatus };
