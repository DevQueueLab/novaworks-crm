import { Building2, CalendarDays, Clock, Hourglass, ListChecks, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { DeadlineChip, PersonCell } from "@/components/projects/task-list";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser, type SessionUser } from "@/lib/auth/dal";
import { listTasks } from "@/lib/data/tasks";
import { deadlineTone, formatDate, formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tasks" };

const copy: Record<SessionUser["role"], { eyebrow: string; title: string; description: string; empty: string }> = {
  agent: {
    eyebrow: "Assigned to you",
    title: "My tasks",
    description: "Everything you own across your projects, soonest due first.",
    empty: "When a manager assigns you work from a meeting, it shows up here.",
  },
  manager: {
    eyebrow: "Your team",
    title: "Team tasks",
    description: "Every task on the projects you manage, soonest due first.",
    empty: "Tasks on the projects you manage will show up here.",
  },
  admin: {
    eyebrow: "Company-wide",
    title: "All tasks",
    description: "Every task across NovaWorks, soonest due first.",
    empty: "Create projects from a meeting transcript and their tasks will show up here.",
  },
};

const headClass = "text-xs font-medium text-muted-foreground";

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await listTasks(user);
  const text = copy[user.role];

  const hours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const overdue = tasks.filter((t) => deadlineTone(t.dueDate) === "overdue").length;
  const dueSoon = tasks.filter((t) => deadlineTone(t.dueDate) === "soon").length;
  const countLabel = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} count={tasks.length} description={text.description} />

      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks yet" description={text.empty} />
      ) : (
        <>
          <div className="-mt-2 flex flex-wrap items-center gap-2">
            <SummaryChip icon={ListChecks} value={tasks.length} label={tasks.length === 1 ? "task" : "tasks"} />
            <SummaryChip icon={Clock} value={formatHours(hours)} label="estimated" />
            {dueSoon > 0 && (
              <SummaryChip
                icon={Hourglass}
                value={dueSoon}
                label="due soon"
                className="border-warning/30 bg-warning/10 text-amber-700 dark:text-amber-300"
              />
            )}
            {overdue > 0 && (
              <SummaryChip
                icon={TriangleAlert}
                value={overdue}
                label="overdue"
                className="border-destructive/20 bg-destructive/10 text-destructive"
              />
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className={cn(headClass, "pl-5")}>Task</TableHead>
                  <TableHead className={headClass}>Project</TableHead>
                  <TableHead className={headClass}>Owner</TableHead>
                  <TableHead className={headClass}>Deadline</TableHead>
                  <TableHead className={cn(headClass, "pr-5 text-right")}>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className="transition-colors hover:bg-muted/30">
                    <TableCell className="max-w-sm py-4 pl-5 align-top whitespace-normal">
                      <div className="font-semibold leading-snug">{task.title}</div>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground text-pretty">
                          {task.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 py-4 align-top whitespace-normal">
                      <Link
                        href={`/projects/${task.project.id}`}
                        className="text-sm font-medium underline-offset-4 transition-colors hover:text-primary hover:underline"
                      >
                        {task.project.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">{task.project.client}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <PersonCell person={task.assignee} showTitle={false} />
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
                  <TableCell colSpan={4} className="py-3 pl-5 text-sm text-muted-foreground">
                    Total · <span className="tabular-nums">{countLabel}</span>
                  </TableCell>
                  <TableCell className="py-3 pr-5 text-right text-sm font-semibold tabular-nums">
                    {formatHours(hours)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="space-y-3 md:hidden">
            {tasks.map((task) => (
              <li key={task.id} className="rounded-xl border bg-card p-4 shadow-xs">
                <Link
                  href={`/projects/${task.project.id}`}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <Building2 className="size-3 shrink-0" />
                  <span className="truncate">
                    {task.project.client} · <span className="text-foreground">{task.project.name}</span>
                  </span>
                </Link>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <h3 className="font-semibold leading-snug">{task.title}</h3>
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
                  <PersonCell person={task.assignee} showTitle={false} />
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
              <span className="font-semibold tabular-nums">{formatHours(hours)}</span>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground shadow-xs",
        className,
      )}
    >
      <Icon className="size-3.5" />
      <span className={cn("font-semibold tabular-nums", !className && "text-foreground")}>
        {value}
      </span>
      {label}
    </span>
  );
}
