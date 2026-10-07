import "server-only";

import { asc, sql } from "drizzle-orm";

import { db } from "@/db";
import { channelMessages, projects, tasks, users, type UserRole } from "@/db/schema";

/** A user as the admin console sees it. Never includes the password hash. */
export type AdminUser = {
  id: string;
  code: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  skills: string[];
  /** ISO timestamp, or null while the account can sign in. */
  deactivatedAt: string | null;
  createdAt: string;
  /** Projects they manage. A manager with projects cannot change role. */
  projectCount: number;
  /** Every task assigned to them, done or not. An agent with tasks cannot change role. */
  taskCount: number;
  openTaskCount: number;
  openHours: number;
};

const roleOrder = sql`case ${users.role} when 'admin' then 0 when 'manager' then 1 else 2 end`;

/**
 * Every account plus a workload summary. The aggregates run as separate
 * single-table queries and are merged here, which keeps each query simple and
 * avoids correlated subqueries.
 */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const [rows, taskLoad, projectLoad] = await Promise.all([
    db
      .select({
        id: users.id,
        code: users.code,
        name: users.name,
        email: users.email,
        role: users.role,
        title: users.title,
        skills: users.skills,
        deactivatedAt: users.deactivatedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(roleOrder, asc(users.code)),
    db
      .select({
        userId: tasks.assigneeId,
        total: sql<number>`count(*)::int`,
        open: sql<number>`(count(*) filter (where ${tasks.status} <> 'done'))::int`,
        openHours: sql<number>`coalesce(sum(${tasks.estimatedHours}) filter (where ${tasks.status} <> 'done'), 0)::float8`,
      })
      .from(tasks)
      .groupBy(tasks.assigneeId),
    db
      .select({ userId: projects.managerId, total: sql<number>`count(*)::int` })
      .from(projects)
      .groupBy(projects.managerId),
  ]);

  const tasksByUser = new Map(taskLoad.map((row) => [row.userId, row] as const));
  const projectsByUser = new Map(projectLoad.map((row) => [row.userId, row.total] as const));

  return rows.map((row) => {
    const load = tasksByUser.get(row.id);
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      email: row.email,
      role: row.role,
      title: row.title,
      skills: row.skills,
      deactivatedAt: row.deactivatedAt ? row.deactivatedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      projectCount: Number(projectsByUser.get(row.id) ?? 0),
      taskCount: Number(load?.total ?? 0),
      openTaskCount: Number(load?.open ?? 0),
      openHours: Number(load?.openHours ?? 0),
    };
  });
}

export type SystemHealth = {
  database: { ok: boolean; latencyMs: number | null };
  counts: {
    users: number;
    activeUsers: number;
    projects: number;
    tasks: number;
    messages: number;
  } | null;
};

/** Database round trip plus record counts for the settings page (admin only, callers check). */
export async function getSystemHealth(): Promise<SystemHealth> {
  try {
    const started = performance.now();
    await db.execute(sql`select 1`);
    const latencyMs = Math.max(1, Math.round(performance.now() - started));

    const [[people], [projectRows], [taskRows], [messageRows]] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`(count(*) filter (where ${users.deactivatedAt} is null))::int`,
        })
        .from(users),
      db.select({ total: sql<number>`count(*)::int` }).from(projects),
      db.select({ total: sql<number>`count(*)::int` }).from(tasks),
      db.select({ total: sql<number>`count(*)::int` }).from(channelMessages),
    ]);

    return {
      database: { ok: true, latencyMs },
      counts: {
        users: Number(people?.total ?? 0),
        activeUsers: Number(people?.active ?? 0),
        projects: Number(projectRows?.total ?? 0),
        tasks: Number(taskRows?.total ?? 0),
        messages: Number(messageRows?.total ?? 0),
      },
    };
  } catch (error) {
    console.error("[getSystemHealth]", error);
    return { database: { ok: false, latencyMs: null }, counts: null };
  }
}
