import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, type Transaction } from "@/db";
import { clients, meetings, projects, tasks } from "@/db/schema";

import type {
  AppliedProject,
  AppliedTask,
  ApplySummary,
  DirectoryMember,
  FieldChange,
} from "./types";
import type { ValidPlan } from "./validate";

type Source = { transcript: string; model: string; createdById: string };

/**
 * Saves a validated plan in ONE transaction: the meeting record, clients,
 * projects and tasks either all land or none do.
 *
 * Re-importing is a sync, not a copy: a project is matched by client + name
 * and a task by title within its project, so a revised transcript updates the
 * records it changes and leaves everything else untouched.
 */
export async function applyPlan(
  plan: ValidPlan,
  directory: DirectoryMember[],
  source: Source,
): Promise<ApplySummary> {
  const nameOf = new Map(directory.map((m) => [m.id, m.name]));

  return db.transaction(async (tx) => {
    // Serialise imports: a double submit waits here instead of racing.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('novaworks:plan-import'))`);

    const [meeting] = await tx
      .insert(meetings)
      .values({
        title: plan.meetingTitle,
        heldOn: plan.meetingDate,
        transcript: source.transcript,
        model: source.model,
        createdById: source.createdById,
      })
      .returning({ id: meetings.id });

    const applied: AppliedProject[] = [];

    for (const planned of plan.projects) {
      const clientId = await findOrCreateClient(tx, planned.clientName);

      const [current] = await tx
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.clientId, clientId),
            sql`lower(${projects.name}) = lower(${planned.name})`,
          ),
        )
        .limit(1);

      let projectId: string;
      const projectChanges: FieldChange[] = [];

      if (!current) {
        const [created] = await tx
          .insert(projects)
          .values({
            clientId,
            managerId: planned.manager.id,
            name: planned.name,
            description: planned.description,
            deadline: planned.deadline,
            sourceMeetingId: meeting.id,
          })
          .returning({ id: projects.id });
        projectId = created.id;
      } else {
        projectId = current.id;
        if (current.managerId !== planned.manager.id) {
          projectChanges.push({
            field: "manager",
            from: nameOf.get(current.managerId) ?? "Unknown",
            to: planned.manager.name,
          });
        }
        if (current.deadline !== planned.deadline) {
          projectChanges.push({ field: "deadline", from: current.deadline, to: planned.deadline });
        }
        await tx
          .update(projects)
          .set({
            managerId: planned.manager.id,
            deadline: planned.deadline,
            description: planned.description || current.description,
            sourceMeetingId: meeting.id,
          })
          .where(eq(projects.id, projectId));
      }

      const existingTasks = current
        ? await tx.select().from(tasks).where(eq(tasks.projectId, projectId))
        : [];
      const existingByTitle = new Map(existingTasks.map((t) => [t.title.toLowerCase(), t]));
      const matched = new Set<string>();
      const appliedTasks: AppliedTask[] = [];

      for (const task of planned.tasks) {
        const previous = existingByTitle.get(task.title.toLowerCase());
        const base = {
          title: task.title,
          assignee: task.assignee.name,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
        };

        if (!previous) {
          const [created] = await tx
            .insert(tasks)
            .values({
              projectId,
              assigneeId: task.assignee.id,
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
              estimatedHours: task.estimatedHours,
              position: task.position,
            })
            .returning({ id: tasks.id });
          appliedTasks.push({ ...base, id: created.id, outcome: "created", changes: [] });
          continue;
        }

        matched.add(previous.id);
        const changes: FieldChange[] = [];
        if (previous.assigneeId !== task.assignee.id) {
          changes.push({
            field: "assignee",
            from: nameOf.get(previous.assigneeId) ?? "Unknown",
            to: task.assignee.name,
          });
        }
        if (previous.dueDate !== task.dueDate) {
          changes.push({ field: "dueDate", from: previous.dueDate, to: task.dueDate });
        }
        if (Number(previous.estimatedHours) !== task.estimatedHours) {
          changes.push({
            field: "estimatedHours",
            from: String(Number(previous.estimatedHours)),
            to: String(task.estimatedHours),
          });
        }

        await tx
          .update(tasks)
          .set({
            assigneeId: task.assignee.id,
            dueDate: task.dueDate,
            estimatedHours: task.estimatedHours,
            // Wording can drift between AI runs; keep it fresh without calling it a change.
            description: task.description || previous.description,
            position: task.position,
          })
          .where(eq(tasks.id, previous.id));

        appliedTasks.push({
          ...base,
          id: previous.id,
          outcome: changes.length > 0 ? "updated" : "unchanged",
          changes,
        });
      }

      const taskChanged = appliedTasks.some((t) => t.outcome !== "unchanged");
      applied.push({
        id: projectId,
        name: planned.name,
        client: planned.clientName,
        manager: planned.manager.name,
        deadline: planned.deadline,
        outcome: !current
          ? "created"
          : projectChanges.length > 0 || taskChanged
            ? "updated"
            : "unchanged",
        changes: projectChanges,
        tasks: appliedTasks,
        untouchedTaskCount: existingTasks.filter((t) => !matched.has(t.id)).length,
      });
    }

    const allTasks = applied.flatMap((p) => p.tasks);
    const count = <T extends { outcome: string }>(items: T[], outcome: string) =>
      items.filter((i) => i.outcome === outcome).length;

    const summary: ApplySummary = {
      meetingId: meeting.id,
      projects: applied,
      counts: {
        projectsCreated: count(applied, "created"),
        projectsUpdated: count(applied, "updated"),
        projectsUnchanged: count(applied, "unchanged"),
        tasksCreated: count(allTasks, "created"),
        tasksUpdated: count(allTasks, "updated"),
        tasksUnchanged: count(allTasks, "unchanged"),
      },
      totalHours: allTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
      excludedScope: plan.excludedScope,
    };

    await tx.update(meetings).set({ summary }).where(eq(meetings.id, meeting.id));
    return summary;
  });
}

async function findOrCreateClient(tx: Transaction, name: string) {
  const [existing] = await tx
    .select({ id: clients.id })
    .from(clients)
    .where(sql`lower(${clients.name}) = lower(${name})`)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await tx.insert(clients).values({ name }).returning({ id: clients.id });
  return created.id;
}
