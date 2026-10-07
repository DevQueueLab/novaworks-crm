import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  Info,
  ListChecks,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AvatarStack, UserAvatar } from "@/components/people";
import { DeadlineChip, TaskList } from "@/components/projects/task-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth/dal";
import { getProject, type PersonRef, type ProjectTask } from "@/lib/data/projects";
import { formatDate, formatHours } from "@/lib/format";

type Props = { params: Promise<{ projectId: string }> };

/** One user + project lookup per request, shared by the metadata and the page. */
const loadProject = cache(async (projectId: string) => {
  const user = await requireUser();
  const project = await getProject(user, projectId);
  return { user, project };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const { project } = await loadProject(projectId);
  return { title: project ? project.name : "Project not found" };
}

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  const { user, project } = await loadProject(projectId);
  if (!project) notFound();

  const isAgent = user.role === "agent";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/projects"
          className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Projects
        </Link>
        <PageHeader title={project.name} description={project.description || undefined} />

        <div className="grid gap-px overflow-hidden rounded-xl border bg-border shadow-xs sm:grid-cols-2 lg:grid-cols-4">
          <MetaCard label="Client" icon={Building2}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-semibold text-foreground/80">
                {project.client.trim().charAt(0).toUpperCase()}
              </span>
              <span className="truncate font-semibold">{project.client}</span>
            </div>
          </MetaCard>
          <MetaCard label="Manager" icon={UserRound}>
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={project.manager.name} code={project.manager.code} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{project.manager.name}</div>
                {project.manager.title && (
                  <div className="truncate text-xs text-muted-foreground">{project.manager.title}</div>
                )}
              </div>
            </div>
          </MetaCard>
          <MetaCard label="Deadline" icon={CalendarDays}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">{formatDate(project.deadline)}</span>
              <DeadlineChip date={project.deadline} />
            </div>
          </MetaCard>
          <MetaCard label="Workload" icon={Clock}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold tabular-nums">
                {project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}
                <span className="text-muted-foreground"> · </span>
                {formatHours(project.totalHours)}
              </span>
              {project.assignees.length > 0 && <AvatarStack people={project.assignees} max={3} />}
            </div>
          </MetaCard>
        </div>

        {project.source && (
          <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="truncate">
              Created from{" "}
              {project.source.title ? (
                <span className="font-medium text-foreground">“{project.source.title}”</span>
              ) : (
                "a meeting transcript"
              )}
              {project.source.heldOn && (
                <span className="tabular-nums"> · {formatDate(project.source.heldOn)}</span>
              )}
            </span>
          </p>
        )}
      </div>

      {isAgent && (
        <Alert className="bg-muted/40 [&>svg]:text-muted-foreground">
          <Info />
          <AlertTitle>Filtered to your work</AlertTitle>
          <AlertDescription>You’re seeing only the tasks assigned to you.</AlertDescription>
        </Alert>
      )}

      {!isAgent && project.tasks.length > 0 && project.assignees.length > 1 && (
        <WorkloadByOwner tasks={project.tasks} total={project.totalHours} />
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base leading-7 font-semibold tracking-tight">Tasks</h2>
            <p className="text-sm text-muted-foreground">
              {isAgent ? "Your tasks on this project, in plan order." : "Every task on this project, in plan order."}
            </p>
          </div>
        </div>
        {project.tasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description={
              isAgent
                ? "Nothing on this project is assigned to you right now."
                : "This project doesn’t have any tasks yet."
            }
          />
        ) : (
          <TaskList tasks={project.tasks} />
        )}
      </section>
    </div>
  );
}

function MetaCard({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-card p-4 sm:px-5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-2.5 min-w-0">{children}</div>
    </div>
  );
}

function WorkloadByOwner({ tasks, total }: { tasks: ProjectTask[]; total: number }) {
  const byPerson = new Map<string, { person: PersonRef; hours: number; count: number }>();
  for (const task of tasks) {
    const row = byPerson.get(task.assignee.id) ?? { person: task.assignee, hours: 0, count: 0 };
    row.hours += task.estimatedHours;
    row.count += 1;
    byPerson.set(task.assignee.id, row);
  }
  const rows = [...byPerson.values()].sort((a, b) => b.hours - a.hours);

  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">Workload by owner</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{formatHours(total)} total</span>
      </div>
      <ul className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {rows.map(({ person, hours, count }) => {
          const share = total > 0 ? Math.round((hours / total) * 100) : 0;
          return (
            <li key={person.id} className="flex items-center gap-3">
              <UserAvatar name={person.name} code={person.code} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{person.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatHours(hours)} · {count} {count === 1 ? "task" : "tasks"}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${share}% of project hours`}
                >
                  <div
                    className="h-full rounded-full bg-primary/80 transition-[width] duration-500 ease-out-expo"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
