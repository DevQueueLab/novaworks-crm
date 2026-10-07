import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { taskActivity, users, type ActivityKind, type ActivityMeta, type UserRole } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/dal";

import { getTask } from "./tasks";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  /** Comment text; null for status changes and edits. */
  body: string | null;
  meta: ActivityMeta | null;
  createdAt: Date;
  actor: { id: string; name: string; code: string; role: UserRole };
};

type Viewer = Pick<SessionUser, "id" | "role">;

/**
 * A task's discussion: comments plus the trail of status moves and edits, oldest first.
 * Empty when the task does not exist OR is outside the viewer's scope.
 */
export async function listTaskActivity(viewer: Viewer, taskId: string): Promise<ActivityItem[]> {
  const task = await getTask(viewer, taskId);
  if (!task) return [];

  return db
    .select({
      id: taskActivity.id,
      kind: taskActivity.kind,
      body: taskActivity.body,
      meta: taskActivity.meta,
      createdAt: taskActivity.createdAt,
      actor: { id: users.id, name: users.name, code: users.code, role: users.role },
    })
    .from(taskActivity)
    .innerJoin(users, eq(users.id, taskActivity.actorId))
    .where(eq(taskActivity.taskId, task.id))
    .orderBy(asc(taskActivity.createdAt), asc(taskActivity.id));
}
