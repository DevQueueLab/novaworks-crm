import "server-only";

import { and, eq, exists, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/dal";

/*
 * Role-based visibility, expressed once as SQL so every query — pages, API
 * routes, aggregates — filters in the database rather than in the UI.
 *
 *   admin   → everything
 *   manager → projects they manage, and all tasks in them
 *   agent   → projects where they own a task, and only their own tasks
 */

type Viewer = Pick<SessionUser, "id" | "role">;

/** Rows of `projects` the viewer may see. `undefined` means no restriction. */
export function visibleProjects(viewer: Viewer): SQL | undefined {
  switch (viewer.role) {
    case "admin":
      return undefined;
    case "manager":
      return eq(projects.managerId, viewer.id);
    case "agent":
      return exists(
        db
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.projectId, projects.id), eq(tasks.assigneeId, viewer.id))),
      );
  }
}

/** Rows of `tasks` the viewer may see. Queries using it must join `projects`. */
export function visibleTasks(viewer: Viewer): SQL | undefined {
  switch (viewer.role) {
    case "admin":
      return undefined;
    case "manager":
      return eq(projects.managerId, viewer.id);
    case "agent":
      return eq(tasks.assigneeId, viewer.id);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);
