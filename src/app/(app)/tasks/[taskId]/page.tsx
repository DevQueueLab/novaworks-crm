import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";

import { DeadlineChip, PersonCell } from "@/components/projects/task-list";
import { AutoRefresh } from "@/components/tasks/auto-refresh";
import { EditTaskSheet, type AgentOption } from "@/components/tasks/edit-task-sheet";
import { TaskDiscussion, type ThreadEntry } from "@/components/tasks/task-discussion";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { requireUser } from "@/lib/auth/dal";
import { listTaskActivity } from "@/lib/data/activity";
import { getTask, type TaskDetail } from "@/lib/data/tasks";
import { getDirectory } from "@/lib/data/team";
import { formatDate, formatDateTime, formatHours, formatRelativeTime } from "@/lib/format";
import type { DirectoryMember } from "@/lib/planning/types";

type Props = { params: Promise<{ taskId: string }> };

/** One user + task lookup per request, shared by the metadata and the page. */
const loadTask = cache(async (taskId: string) => {
  const user = await requireUser();
  const task = await getTask(user, taskId);
  return { user, task };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskId } = await params;
  const { task } = await loadTask(taskId);
  return { title: task ? task.title : "Task not found" };
}

const stamp = (date: Date) => ({
  iso: date.toISOString(),
  relative: formatRelativeTime(date),
  absolute: formatDateTime(date),
});

export default async function TaskPage({ params }: Props) {
  const { taskId } = await params;
  const { user, task } = await loadTask(taskId);
  if (!task) notFound();

  const [activity, directory] = await Promise.all([
    listTaskActivity(user, task.id),
    task.can.edit ? getDirectory() : Promise.resolve<DirectoryMember[]>([]),
  ]);

  const thread: ThreadEntry[] = activity.map((item) => ({
    id: item.id,
    kind: item.kind,
    body: item.body,
    meta: item.meta,
    actor: item.actor,
    at: stamp(item.createdAt),
  }));

  const agents: AgentOption[] = directory
    .filter((member) => member.role === "agent")
    .map(({ id, code, name, title }) => ({ id, code, name, title }));
  if (task.can.edit && !agents.some((agent) => agent.id === task.assignee.id)) agents.unshift(task.assignee);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={10_000} />

      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <li className="shrink-0">
            <Link href="/projects" className="transition-colors hover:text-foreground">
              Projects
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0 text-muted-foreground/50">
            /
          </li>
          <li className="min-w-0">
            <Link
              href={`/projects/${task.project.id}`}
              className="block truncate transition-colors hover:text-foreground"
            >
              {task.project.name}
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0 text-muted-foreground/50">
            /
          </li>
          <li aria-current="page" className="min-w-0 truncate text-foreground">
            {task.title}
          </li>
        </ol>
      </nav>

      {/* Mobile: header, details, then content. Desktop: content column plus a sticky 320px panel. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:gap-x-10">
        <header className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
          <h1 className="text-2xl leading-8 font-semibold tracking-tight text-balance [overflow-wrap:anywhere]">
            {task.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusSelect taskId={task.id} status={task.status} disabled={!task.can.changeStatus} />
            {task.can.edit && (
              <EditTaskSheet
                task={{
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  assigneeId: task.assignee.id,
                  dueDate: task.dueDate,
                  estimatedHours: task.estimatedHours,
                }}
                agents={agents}
                projectDeadline={task.project.deadline}
              />
            )}
          </div>
        </header>

        <aside
          aria-label="Task details"
          className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
        >
          <TaskDetails task={task} />
        </aside>

        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-2">
          <section aria-labelledby="task-description-heading" className="space-y-2">
            <h2 id="task-description-heading" className="text-sm font-semibold">
              Description
            </h2>
            {task.description ? (
              <p className="max-w-[72ch] text-sm leading-6 whitespace-pre-line text-foreground/90 [overflow-wrap:anywhere]">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No description yet.</p>
            )}
          </section>

          <TaskDiscussion
            taskId={task.id}
            viewer={{ id: user.id, name: user.name, code: user.code, role: user.role }}
            entries={thread}
          />
        </div>
      </div>
    </div>
  );
}

function TaskDetails({ task }: { task: TaskDetail }) {
  const { source, statusChangedAt } = task;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">Details</h2>
      <dl className="divide-y">
        <Detail label="Assignee">
          <PersonCell person={task.assignee} />
        </Detail>

        <Detail label="Project">
          <Link
            href={`/projects/${task.project.id}`}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {task.project.name}
          </Link>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{task.project.client}</span>
          </p>
        </Detail>

        <Detail label="Manager">
          <PersonCell person={task.project.managerRef} showTitle={false} />
        </Detail>

        <Detail label="Deadline">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium tabular-nums">{formatDate(task.dueDate)}</span>
            <DeadlineChip date={task.dueDate} />
          </div>
        </Detail>

        <Detail label="Estimate">
          <span className="text-sm font-medium tabular-nums">{formatHours(task.estimatedHours)}</span>
        </Detail>

        {source && (
          <Detail label="Created from meeting">
            <p className="text-sm font-medium">{source.title ?? "Untitled meeting"}</p>
            {source.heldOn && (
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{formatDate(source.heldOn)}</p>
            )}
          </Detail>
        )}

        <Detail label="Last status change">
          {statusChangedAt ? (
            <>
              <p className="text-sm font-medium">{formatRelativeTime(statusChangedAt)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                <time dateTime={statusChangedAt.toISOString()}>{formatDateTime(statusChangedAt)}</time>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not moved yet</p>
          )}
        </Detail>
      </dl>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 min-w-0">{children}</dd>
    </div>
  );
}
