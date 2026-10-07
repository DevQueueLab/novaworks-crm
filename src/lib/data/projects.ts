import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { clients, meetings, projects, tasks, users, type TaskStatus } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/dal";

import { isUuid, visibleProjects, visibleTasks } from "./access";

export type PersonRef = { id: string; code: string; name: string; title: string };

export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  deadline: string;
  client: string;
  manager: PersonRef;
  /** Counts and hours only cover tasks the viewer is allowed to see. */
  taskCount: number;
  /** Visible tasks already in the Done column. */
  doneCount: number;
  totalHours: number;
  assignees: PersonRef[];
  updatedAt: Date;
};

export type ProjectTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  estimatedHours: number;
  status: TaskStatus;
  assignee: PersonRef;
};

export type ProjectDetail = ProjectSummary & {
  tasks: ProjectTask[];
  source: { meetingId: string; title: string | null; heldOn: string | null } | null;
};

type Viewer = Pick<SessionUser, "id" | "role">;

const manager = alias(users, "manager");
const assignee = alias(users, "assignee");

/** The public face of a user, for each alias of `users`. */
const managerColumns = { id: manager.id, code: manager.code, name: manager.name, title: manager.title };
const assigneeColumns = { id: assignee.id, code: assignee.code, name: assignee.name, title: assignee.title };

/** Projects visible to the viewer, soonest deadline first. */
export async function listProjects(viewer: Viewer): Promise<ProjectSummary[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      deadline: projects.deadline,
      updatedAt: projects.updatedAt,
      client: clients.name,
      manager: managerColumns,
      taskCount: sql<number>`count(${tasks.id})::int`,
      doneCount: sql<number>`(count(${tasks.id}) filter (where ${tasks.status} = 'done'))::int`,
      totalHours: sql<number>`coalesce(sum(${tasks.estimatedHours}), 0)::float8`,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .innerJoin(manager, eq(manager.id, projects.managerId))
    .leftJoin(tasks, and(eq(tasks.projectId, projects.id), visibleTasks(viewer)))
    .where(visibleProjects(viewer))
    .groupBy(projects.id, clients.id, manager.id)
    .orderBy(asc(projects.deadline), asc(projects.name));

  const team = await assigneesByProject(
    viewer,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, assignees: team.get(r.id) ?? [] }));
}

/** One project with its visible tasks, or null when it does not exist OR is not the viewer's. */
export async function getProject(viewer: Viewer, projectId: string): Promise<ProjectDetail | null> {
  if (!isUuid(projectId)) return null;

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      deadline: projects.deadline,
      updatedAt: projects.updatedAt,
      client: clients.name,
      manager: managerColumns,
      meetingId: meetings.id,
      meetingTitle: meetings.title,
      meetingHeldOn: meetings.heldOn,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .innerJoin(manager, eq(manager.id, projects.managerId))
    .leftJoin(meetings, eq(meetings.id, projects.sourceMeetingId))
    .where(and(eq(projects.id, projectId), visibleProjects(viewer)))
    .limit(1);

  if (!project) return null;

  const projectTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      dueDate: tasks.dueDate,
      estimatedHours: tasks.estimatedHours,
      status: tasks.status,
      assignee: assigneeColumns,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .where(and(eq(tasks.projectId, projectId), visibleTasks(viewer)))
    .orderBy(asc(tasks.position), asc(tasks.dueDate));

  const { meetingId, meetingTitle, meetingHeldOn, ...rest } = project;
  const people = new Map(projectTasks.map((t) => [t.assignee.id, t.assignee]));

  return {
    ...rest,
    taskCount: projectTasks.length,
    doneCount: projectTasks.filter((t) => t.status === "done").length,
    totalHours: projectTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
    assignees: [...people.values()],
    tasks: projectTasks,
    source: meetingId ? { meetingId, title: meetingTitle, heldOn: meetingHeldOn } : null,
  };
}

async function assigneesByProject(viewer: Viewer, projectIds: string[]) {
  const result = new Map<string, PersonRef[]>();
  if (projectIds.length === 0) return result;

  const rows = await db
    .selectDistinct({ projectId: tasks.projectId, person: assigneeColumns })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .where(and(inArray(tasks.projectId, projectIds), visibleTasks(viewer)))
    .orderBy(asc(assignee.code));

  for (const { projectId, person } of rows) {
    result.set(projectId, [...(result.get(projectId) ?? []), person]);
  }
  return result;
}
