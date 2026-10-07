"use client";

import {
  ArrowRight,
  Ban,
  Building2,
  CalendarDays,
  CircleCheck,
  Clock,
  Cpu,
  Info,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/people";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatHours, formatShortDate } from "@/lib/format";
import type {
  AppliedProject,
  ApplySummary,
  ChangeOutcome,
  DirectoryMember,
  FieldChange,
} from "@/lib/planning/types";
import { cn } from "@/lib/utils";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const shortDate = (value: string) => (ISO_DATE.test(value) ? formatShortDate(value) : value);
const longDate = (value: string) => (ISO_DATE.test(value) ? formatDate(value) : value);

const outcomeStyles: Record<ChangeOutcome, { label: string; className: string }> = {
  created: {
    label: "Created",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  updated: {
    label: "Updated",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  unchanged: {
    label: "Unchanged",
    className: "border-border bg-muted text-muted-foreground",
  },
};

function OutcomeBadge({ outcome }: { outcome: ChangeOutcome }) {
  const style = outcomeStyles[outcome];
  return (
    <Badge variant="outline" className={cn("shrink-0 font-medium", style.className)}>
      {style.label}
    </Badge>
  );
}

const fieldLabels: Record<FieldChange["field"], string> = {
  client: "Client",
  manager: "Manager",
  deadline: "Deadline",
  assignee: "Owner",
  dueDate: "Deadline",
  estimatedHours: "Estimated hours",
};

function formatChangeValue(field: FieldChange["field"], value: string) {
  if (!value) return "none";
  if (field === "deadline" || field === "dueDate") return shortDate(value);
  if (field === "estimatedHours") {
    const hours = Number(value);
    return Number.isFinite(hours) ? formatHours(hours) : value;
  }
  return value;
}

function ChangeList({ changes, className }: { changes: FieldChange[]; className?: string }) {
  if (changes.length === 0) return null;
  return (
    <ul className={cn("space-y-1", className)}>
      {changes.map((change) => (
        <li
          key={`${change.field}-${change.from}-${change.to}`}
          className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground"
        >
          <span className="font-medium text-foreground/80">{fieldLabels[change.field]}:</span>
          <s className="decoration-muted-foreground/60">{formatChangeValue(change.field, change.from)}</s>
          <ArrowRight className="size-3" aria-label="changed to" />
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {formatChangeValue(change.field, change.to)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "3 projects and 12 tasks saved" + "Updated 1 task · 11 unchanged" style breakdown. */
function describeCounts(counts: ApplySummary["counts"]) {
  const projects = counts.projectsCreated + counts.projectsUpdated + counts.projectsUnchanged;
  const tasks = counts.tasksCreated + counts.tasksUpdated + counts.tasksUnchanged;
  const nothingChanged =
    counts.projectsCreated + counts.projectsUpdated + counts.tasksCreated + counts.tasksUpdated === 0;

  const headline = nothingChanged
    ? "Everything is already up to date"
    : `${plural(projects, "project")} and ${plural(tasks, "task")} saved`;

  const parts: string[] = [];
  if (counts.projectsCreated) parts.push(`Created ${plural(counts.projectsCreated, "project")}`);
  if (counts.projectsUpdated) parts.push(`Updated ${plural(counts.projectsUpdated, "project")}`);
  if (counts.tasksCreated) parts.push(`Created ${plural(counts.tasksCreated, "task")}`);
  if (counts.tasksUpdated) parts.push(`Updated ${plural(counts.tasksUpdated, "task")}`);
  const unchanged = counts.tasksUnchanged;
  if (unchanged && !nothingChanged) parts.push(`${unchanged} unchanged`);

  const breakdown = nothingChanged
    ? `${plural(projects, "project")} and ${plural(tasks, "task")} matched what is already saved. No edits were needed.`
    : counts.projectsUpdated + counts.projectsUnchanged + counts.tasksUpdated + counts.tasksUnchanged > 0
      ? parts.join(" · ")
      : null;

  return { headline, breakdown, tasks };
}

export function ResultView({
  summary,
  model,
  directory,
  onImportAnother,
}: {
  summary: ApplySummary;
  model: string;
  directory: DirectoryMember[];
  onImportAnother: () => void;
}) {
  const { headline, breakdown, tasks } = describeCounts(summary.counts);
  const codeFor = (name: string) => directory.find((member) => member.name === name)?.code;

  return (
    <div className="space-y-6">
      <Card className="relative gap-0 overflow-hidden rounded-xl border-emerald-500/25 py-0 animate-in fade-in zoom-in-95 duration-500">
        <CardContent className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
            <CircleCheck className="size-6 animate-in zoom-in-50 duration-500" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{headline}</h2>
            {breakdown && <p className="text-sm font-medium text-foreground/80">{breakdown}</p>}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {formatHours(summary.totalHours)} of developer effort across {plural(tasks, "task")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="size-3.5" aria-hidden />
                Generated by <span className="font-mono text-xs">{model}</span>
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button asChild>
              <Link href="/projects">
                View projects
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onImportAnother}>
              <RotateCcw />
              Import another
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {summary.projects.map((project, index) => (
          <ProjectResult key={project.id} project={project} index={index} codeFor={codeFor} />
        ))}
      </div>

      {summary.excludedScope.length > 0 && (
        <Card
          className="gap-0 rounded-xl py-0 animate-in fade-in slide-in-from-bottom-2 duration-500 [animation-fill-mode:both]"
          style={{ animationDelay: `${(summary.projects.length + 1) * 90}ms` }}
        >
          <CardContent className="space-y-3 p-5 sm:p-6">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Ban className="size-4 text-muted-foreground" />
                Left out on purpose
              </h3>
              <p className="text-sm text-muted-foreground">
                Rejected or future work the AI deliberately did not turn into tasks.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {summary.excludedScope.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
                >
                  <Ban className="size-3 shrink-0 text-destructive/70" />
                  <span className="line-through decoration-muted-foreground/40">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function ProjectResult({
  project,
  index,
  codeFor,
}: {
  project: AppliedProject;
  index: number;
  codeFor: (name: string) => string | undefined;
}) {
  const hours = project.tasks.reduce((sum, task) => sum + task.estimatedHours, 0);

  return (
    <Card
      className="gap-0 overflow-hidden rounded-xl p-0 animate-in fade-in slide-in-from-bottom-2 duration-500 [animation-fill-mode:both]"
      style={{ animationDelay: `${(index + 1) * 90}ms` }}
    >
      <div className="space-y-3 border-b bg-muted/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight">{project.name}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{project.client}</span>
            </p>
          </div>
          <OutcomeBadge outcome={project.outcome} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserAvatar name={project.manager} code={codeFor(project.manager)} size="sm" />
            <span className="text-foreground/80">{project.manager}</span>
            <span>· Manager</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Due {longDate(project.deadline)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {formatHours(hours)} · {plural(project.tasks.length, "task")}
          </span>
        </div>
        <ChangeList changes={project.changes} />
      </div>

      <ul className="divide-y">
        {project.tasks.map((task) => (
          <li key={task.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start justify-between gap-2 sm:justify-start">
                <p className="text-sm font-medium leading-snug">{task.title}</p>
                <span className="sm:hidden">
                  <OutcomeBadge outcome={task.outcome} />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <UserAvatar name={task.assignee} code={codeFor(task.assignee)} size="sm" className="size-5" />
                  {task.assignee}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {shortDate(task.dueDate)}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="size-3" />
                  {formatHours(task.estimatedHours)}
                </span>
              </div>
              <ChangeList changes={task.changes} />
            </div>
            <span className="hidden sm:block">
              <OutcomeBadge outcome={task.outcome} />
            </span>
          </li>
        ))}
      </ul>

      {project.untouchedTaskCount > 0 && (
        <p className="flex items-center gap-2 border-t bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          {project.untouchedTaskCount === 1
            ? "1 existing task not mentioned in this transcript was kept."
            : `${project.untouchedTaskCount} existing tasks not mentioned in this transcript were kept.`}
        </p>
      )}
    </Card>
  );
}
