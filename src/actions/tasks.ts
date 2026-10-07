"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { projects, tasks, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { changeableTasks } from "@/lib/data/access";
import { isIsoDate } from "@/lib/planning/validate";
import { TASK_STATUSES } from "@/lib/task-status";

export type TaskActionResult = { ok: true } | { ok: false; message: string };

const statusInput = z.object({ taskId: z.uuid(), status: z.enum(TASK_STATUSES) });

/** Board move. Admin: any task · manager: tasks in their projects · agent: their own tasks. */
export async function updateTaskStatus(taskId: string, status: string): Promise<TaskActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session has expired. Please sign in again." };

  const parsed = statusInput.safeParse({ taskId, status });
  if (!parsed.success) return { ok: false, message: "Unknown task or status." };

  const updated = await db
    .update(tasks)
    .set({ status: parsed.data.status, statusChangedAt: new Date() })
    .where(and(eq(tasks.id, parsed.data.taskId), changeableTasks(user, "status")))
    .returning({ id: tasks.id });

  if (updated.length === 0) return { ok: false, message: "You can't change this task." };
  revalidatePath("/", "layout");
  return { ok: true };
}

const editInput = z.object({
  taskId: z.uuid(),
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(4000),
  assigneeId: z.uuid("Choose an owner."),
  dueDate: z.string().refine(isIsoDate, "Choose a valid deadline."),
  estimatedHours: z.number().positive("Hours must be more than zero.").max(1000),
});

export type TaskEditInput = z.input<typeof editInput>;

/** Edit task details. Only the admin or the project's manager may do this. */
export async function updateTask(input: TaskEditInput): Promise<TaskActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session has expired. Please sign in again." };
  if (user.role === "agent") return { ok: false, message: "Only managers and the admin can edit tasks." };

  const parsed = editInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid task." };
  const data = parsed.data;

  const [owner] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, data.assigneeId))
    .limit(1);
  if (owner?.role !== "agent") return { ok: false, message: "Tasks can only be assigned to an agent." };

  const [project] = await db
    .select({ deadline: projects.deadline })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(eq(tasks.id, data.taskId))
    .limit(1);
  if (!project) return { ok: false, message: "Task not found." };
  if (data.dueDate > project.deadline) {
    return { ok: false, message: `The deadline can't be after the project deadline (${project.deadline}).` };
  }

  try {
    const updated = await db
      .update(tasks)
      .set({
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
        estimatedHours: Math.round(data.estimatedHours * 100) / 100,
      })
      .where(and(eq(tasks.id, data.taskId), changeableTasks(user, "fields")))
      .returning({ id: tasks.id });
    if (updated.length === 0) return { ok: false, message: "You can't edit this task." };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, message: "Another task in this project already has that title." };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
