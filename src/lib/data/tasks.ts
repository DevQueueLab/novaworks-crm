import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { clients, meetings, projects, tasks, users, type TaskStatus } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/dal";

import { isUuid, visibleTasks } from "./access";
import type { PersonRef } from "./projects";

export type TaskListItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  estimatedHours: number;
  status: TaskStatus;
  assignee: PersonRef;
  project: { id: string; name: string; client: string; deadline: string; manager: string };
};

export type TaskDetail = TaskListItem & {
  statusChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project: TaskListItem["project"] & { description: string; managerRef: PersonRef };
  source: { meetingId: string; title: string | null; heldOn: string | null } | null;
  /** Server-computed permissions for the current viewer. */
  can: { changeStatus: boolean; edit: boolean };
};

type Viewer = Pick<SessionUser, "id" | "role">;

const assignee = alias(users, "assignee");
const manager = alias(users, "manager");

const listColumns = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  dueDate: tasks.dueDate,
  estimatedHours: tasks.estimatedHours,
  status: tasks.status,
  assignee: { id: assignee.id, code: assignee.code, name: assignee.name, title: assignee.title },
  project: {
    id: projects.id,
    name: projects.name,
    client: clients.name,
    deadline: projects.deadline,
    manager: manager.name,
  },
};

/** Tasks visible to the viewer (an agent gets only their own), soonest first; optionally one project. */
export async function listTasks(viewer: Viewer, options: { projectId?: string } = {}): Promise<TaskListItem[]> {
  if (options.projectId && !isUuid(options.projectId)) return [];
  return db
    .select(listColumns)
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .innerJoin(manager, eq(manager.id, projects.managerId))
    .innerJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .where(
      and(
        visibleTasks(viewer),
        options.projectId ? eq(tasks.projectId, options.projectId) : undefined,
      ),
    )
    .orderBy(asc(tasks.dueDate), asc(projects.name), asc(tasks.position));
}

/** One task with its project context, or null when it does not exist OR is outside the viewer's scope. */
export async function getTask(viewer: Viewer, taskId: string): Promise<TaskDetail | null> {
  if (!isUuid(taskId)) return null;

  const [row] = await db
    .select({
      ...listColumns,
      statusChangedAt: tasks.statusChangedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      projectDescription: projects.description,
      managerRef: { id: manager.id, code: manager.code, name: manager.name, title: manager.title },
      meetingId: meetings.id,
      meetingTitle: meetings.title,
      meetingHeldOn: meetings.heldOn,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .innerJoin(manager, eq(manager.id, projects.managerId))
    .innerJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .leftJoin(meetings, eq(meetings.id, projects.sourceMeetingId))
    .where(and(eq(tasks.id, taskId), visibleTasks(viewer)))
    .limit(1);

  if (!row) return null;

  const { projectDescription, managerRef, meetingId, meetingTitle, meetingHeldOn, ...task } = row;
  const managesProject = viewer.role === "admin" || managerRef.id === viewer.id;

  return {
    ...task,
    project: { ...task.project, description: projectDescription, managerRef },
    source: meetingId ? { meetingId, title: meetingTitle, heldOn: meetingHeldOn } : null,
    // Anyone who can see a task can move it; only its manager (or the admin) can edit it.
    can: { changeStatus: true, edit: managesProject },
  };
}
