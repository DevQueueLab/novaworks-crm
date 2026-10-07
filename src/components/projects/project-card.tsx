import { ArrowUpRight, Building2, CalendarDays, Clock, ListChecks } from "lucide-react";
import Link from "next/link";

import { AvatarStack, UserAvatar } from "@/components/people";
import type { ProjectSummary } from "@/lib/data/projects";
import {
  deadlineTone,
  deadlineToneClass,
  formatHours,
  formatShortDate,
  relativeDeadline,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const relative = relativeDeadline(project.deadline);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative flex h-full flex-col rounded-xl border bg-card p-5 shadow-xs outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Building2 className="size-3.5 shrink-0" />
          <span className="truncate">{project.client}</span>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <h3 className="mt-2 font-semibold leading-snug tracking-tight text-balance transition-colors group-hover:text-primary">
        {project.name}
      </h3>
      {project.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground text-pretty">
          {project.description}
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <div className="flex min-w-0 items-center gap-2" title={`Manager · ${project.manager.name}`}>
            <UserAvatar name={project.manager.name} code={project.manager.code} size="sm" />
            <span className="truncate text-sm font-medium">{project.manager.name}</span>
          </div>
          <span
            title={relative}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums",
              deadlineToneClass[deadlineTone(project.deadline)],
            )}
          >
            <CalendarDays className="size-3.5" />
            {formatShortDate(project.deadline)}
            <span className="hidden opacity-70 sm:inline">· {relative}</span>
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3.5" />
              {project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatHours(project.totalHours)}
            </span>
          </div>
          {project.assignees.length > 0 && <AvatarStack people={project.assignees} />}
        </div>
      </div>
    </Link>
  );
}
