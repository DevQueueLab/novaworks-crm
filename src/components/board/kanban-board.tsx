"use client";

import { CalendarDays, Clock, Ellipsis } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useId, useOptimistic, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { updateTaskStatus } from "@/actions/tasks";
import { UserAvatar } from "@/components/people";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskListItem } from "@/lib/data/tasks";
import {
  deadlineTone,
  formatHours,
  formatShortDate,
  relativeDeadline,
  type DeadlineTone,
} from "@/lib/format";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/task-status";
import { cn } from "@/lib/utils";

/** Our own drag payload type, so columns ignore files, links and text dragged in from elsewhere. */
const DRAG_TYPE = "application/x-novaworks-task";

const statusDot: Record<TaskStatus, string> = {
  todo: "bg-muted-foreground/40",
  in_progress: "bg-primary",
  in_review: "bg-warning",
  done: "bg-success",
};

const dueToneClass: Record<DeadlineTone, string> = {
  overdue: "text-destructive",
  soon: "text-amber-700 dark:text-amber-300",
  upcoming: "text-muted-foreground",
};

type Move = { taskId: string; status: TaskStatus };

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * Status board. Cards move by drag and drop or from each card's menu (keyboard
 * and touch). Moves show instantly and roll back if the server refuses them.
 */
export function KanbanBoard({ tasks, showProject = false }: { tasks: TaskListItem[]; showProject?: boolean }) {
  const router = useRouter();
  const idPrefix = useId();
  const [board, applyMove] = useOptimistic(tasks, (current: TaskListItem[], move: Move) =>
    current.map((task) => (task.id === move.taskId ? { ...task, status: move.status } : task)),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const sourceStatus = board.find((task) => task.id === draggingId)?.status;

  function moveTask(taskId: string, status: TaskStatus) {
    const task = board.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    setAnnouncement(`${task.title} moved to ${TASK_STATUS_LABEL[status]}`);

    startTransition(async () => {
      applyMove({ taskId, status });
      const result = await updateTaskStatus(taskId, status).catch(() => ({
        ok: false as const,
        message: "Couldn’t reach the server. Check your connection and try again.",
      }));
      if (!result.ok) {
        toast.error(result.message);
        router.refresh();
      }
    });
  }

  function handleDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    event.dataTransfer.setData(DRAG_TYPE, taskId);
    event.dataTransfer.effectAllowed = "move";
    // Fade the card on the next tick so the browser's drag image stays solid.
    window.setTimeout(() => setDraggingId(taskId), 0);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, status: TaskStatus) {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropTarget !== status) setDropTarget(status);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>, status: TaskStatus) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDropTarget((current) => (current === status ? null : current));
  }

  function handleDrop(event: DragEvent<HTMLElement>, status: TaskStatus) {
    const taskId = event.dataTransfer.getData(DRAG_TYPE);
    if (!taskId) return;
    event.preventDefault();
    // The source card may unmount before its dragend fires, so reset here too.
    handleDragEnd();
    moveTask(taskId, status);
  }

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="grid min-w-full auto-cols-[minmax(16.5rem,1fr)] grid-flow-col gap-3">
          {TASK_STATUSES.map((status) => {
            const items = board.filter((task) => task.status === status);
            const hours = items.reduce((sum, task) => sum + task.estimatedHours, 0);
            const isTarget = dropTarget === status && sourceStatus !== status;
            const headingId = `${idPrefix}-${status}`;

            return (
              <section
                key={status}
                aria-labelledby={headingId}
                onDragOver={(event) => handleDragOver(event, status)}
                onDragLeave={(event) => handleDragLeave(event, status)}
                onDrop={(event) => handleDrop(event, status)}
                className={cn(
                  "flex min-h-80 flex-col rounded-xl border bg-muted/40 transition-colors duration-150",
                  isTarget && "border-primary/50 bg-accent/60",
                )}
              >
                <header className="flex items-center justify-between gap-3 px-3 pt-3 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className={cn("size-2 shrink-0 rounded-full", statusDot[status])} />
                    <h2 id={headingId} className="truncate text-sm font-medium">
                      {TASK_STATUS_LABEL[status]}
                    </h2>
                    <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    <span className="sr-only">Estimated </span>
                    {formatHours(hours)}
                  </span>
                </header>

                <ul className="flex flex-1 flex-col gap-2 px-2 pb-2">
                  {items.map((task) => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        showProject={showProject}
                        dragging={draggingId === task.id}
                        onDragStart={(event) => handleDragStart(event, task.id)}
                        onDragEnd={handleDragEnd}
                        onMove={(next) => moveTask(task.id, next)}
                      />
                    </li>
                  ))}
                  {items.length === 0 && (
                    <li
                      className={cn(
                        "flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground transition-colors duration-150",
                        isTarget && "border-primary/50",
                      )}
                    >
                      No tasks
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function TaskCard({
  task,
  showProject,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  task: TaskListItem;
  showProject: boolean;
  dragging: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  // A finished task is never "late": keep its date neutral.
  const tone: DeadlineTone = task.status === "done" ? "upcoming" : deadlineTone(task.dueDate);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "relative rounded-lg border bg-card p-3 shadow-xs transition-[border-color,opacity] duration-150 hover:border-foreground/20",
        dragging && "opacity-40",
      )}
    >
      {showProject && (
        <p className="mb-1 truncate text-xs text-muted-foreground">
          {task.project.name} · {task.project.client}
        </p>
      )}

      <div className="flex items-start gap-2">
        {/* Stretched link: the whole card opens the task; draggable={false} hands the drag to the card. */}
        <Link
          href={`/tasks/${task.id}`}
          draggable={false}
          className="min-w-0 flex-1 text-sm leading-snug font-medium text-pretty outline-none transition-colors after:absolute after:inset-0 after:z-[1] after:rounded-lg hover:text-primary focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
        >
          {task.title}
        </Link>
        <MoveMenu task={task} onMove={onMove} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <UserAvatar name={task.assignee.name} code={task.assignee.code} size="sm" />
          <span className="sr-only">Owner </span>
          <span className="truncate">{firstName(task.assignee.name)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5 tabular-nums">
          <span className={cn("inline-flex items-center gap-1", dueToneClass[tone])}>
            <CalendarDays className="size-3.5" aria-hidden />
            <span className="sr-only">Due </span>
            {formatShortDate(task.dueDate)}
            {tone !== "upcoming" && <span className="sr-only">, {relativeDeadline(task.dueDate)}</span>}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            <span className="sr-only">Estimate </span>
            {formatHours(task.estimatedHours)}
          </span>
        </span>
      </div>
    </article>
  );
}

/** Keyboard and touch friendly alternative to dragging. */
function MoveMenu({ task, onMove }: { task: TaskListItem; onMove: (status: TaskStatus) => void }) {
  return (
    // Non-modal: the card (and this menu) remounts in another column right after a pick.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Move ${task.title}`}
          className="relative z-10 -mt-0.5 -mr-1 text-muted-foreground data-[state=open]:bg-accent"
        >
          <Ellipsis className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Move to</div>
        {TASK_STATUSES.filter((status) => status !== task.status).map((status) => (
          <DropdownMenuItem key={status} onSelect={() => onMove(status)}>
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", statusDot[status])} />
            {TASK_STATUS_LABEL[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
