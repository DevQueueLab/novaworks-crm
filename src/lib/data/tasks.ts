import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { clients, projects, tasks, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/dal";

import { visibleTasks } from "./access";
import type { PersonRef } from "./projects";

export type TaskListItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  estimatedHours: number;
  assignee: PersonRef;
  project: { id: string; name: string; client: string; deadline: string; manager: string };
};

const assignee = alias(users, "assignee");
const manager = alias(users, "manager");

/** Tasks visible to the viewer (an agent gets only their own), soonest first. */
export async function listTasks(viewer: Pick<SessionUser, "id" | "role">): Promise<TaskListItem[]> {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      dueDate: tasks.dueDate,
      estimatedHours: tasks.estimatedHours,
      assignee: {
        id: assignee.id,
        code: assignee.code,
        name: assignee.name,
        title: assignee.title,
      },
      project: {
        id: projects.id,
        name: projects.name,
        client: clients.name,
        deadline: projects.deadline,
        manager: manager.name,
      },
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .innerJoin(manager, eq(manager.id, projects.managerId))
    .innerJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .where(and(visibleTasks(viewer)))
    .orderBy(asc(tasks.dueDate), asc(projects.name), asc(tasks.position));
}
