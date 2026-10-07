import { CalendarDays, Clock } from "lucide-react";

import { UserAvatar } from "@/components/people";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PersonRef } from "@/lib/data/projects";
import {
  deadlineTone,
  deadlineToneClass,
  formatDate,
  formatHours,
  relativeDeadline,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/** Minimal task shape — `ProjectTask` and `TaskListItem` both satisfy it. */
export type TaskRowData = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  estimatedHours: number;
  assignee: PersonRef;
};

/** Tone-coloured pill with the relative deadline ("in 5 days", "2 days overdue"). */
export function DeadlineChip({ date, className }: { date: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap tabular-nums",
        deadlineToneClass[deadlineTone(date)],
        className,
      )}
    >
      {relativeDeadline(date)}
    </span>
  );
}

/** Person with avatar, name and (optionally) their job title. */
export function PersonCell({ person, showTitle = true }: { person: PersonRef; showTitle?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar name={person.name} code={person.code} size={showTitle ? "md" : "sm"} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{person.name}</div>
        {showTitle && person.title && (
          <div className="truncate text-xs text-muted-foreground">{person.title}</div>
        )}
      </div>
    </div>
  );
}

const sumHours = (tasks: TaskRowData[]) => tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

export function TaskList({ tasks }: { tasks: TaskRowData[] }) {
  const total = sumHours(tasks);
  const countLabel = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-5 text-xs font-medium text-muted-foreground">Task</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Owner</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Deadline</TableHead>
              <TableHead className="pr-5 text-right text-xs font-medium text-muted-foreground">
                Est. hours
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="transition-colors hover:bg-muted/30">
                <TableCell className="max-w-md py-4 pl-5 align-top whitespace-normal">
                  <div className="font-semibold leading-snug">{task.title}</div>
                  {task.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground text-pretty">
                      {task.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className="py-4 align-top">
                  <PersonCell person={task.assignee} />
                </TableCell>
                <TableCell className="py-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm tabular-nums">{formatDate(task.dueDate)}</span>
                    <DeadlineChip date={task.dueDate} />
                  </div>
                </TableCell>
                <TableCell className="py-4 pr-5 text-right align-top text-sm font-medium tabular-nums">
                  {formatHours(task.estimatedHours)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={3} className="py-3 pl-5 text-sm text-muted-foreground">
                Total · <span className="tabular-nums">{countLabel}</span>
              </TableCell>
              <TableCell className="py-3 pr-5 text-right text-sm font-semibold tabular-nums">
                {formatHours(total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold leading-snug">{task.title}</h4>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground tabular-nums">
                <Clock className="size-3" />
                {formatHours(task.estimatedHours)}
              </span>
            </div>
            {task.description && (
              <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground text-pretty">
                {task.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <PersonCell person={task.assignee} />
              <div className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <CalendarDays className="size-3.5" />
                  {formatDate(task.dueDate)}
                </span>
                <DeadlineChip date={task.dueDate} />
              </div>
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground tabular-nums">Total · {countLabel}</span>
          <span className="font-semibold tabular-nums">{formatHours(total)}</span>
        </li>
      </ul>
    </>
  );
}
