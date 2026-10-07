"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { taskActivity } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getTask } from "@/lib/data/tasks";

export type CommentActionResult = { ok: true } | { ok: false; message: string };

const commentInput = z.object({
  taskId: z.uuid("Task not found."),
  body: z
    .string()
    .trim()
    .min(1, "Write a comment first.")
    .max(4000, "Comments can be up to 4,000 characters."),
});

/** Post a comment on a task. Anyone who can see the task can join its discussion. */
export async function addTaskComment(taskId: string, body: string): Promise<CommentActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session has expired. Please sign in again." };

  const parsed = commentInput.safeParse({ taskId, body });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid comment." };

  // Same visibility rules as the task page: unknown and out-of-scope tasks look identical.
  const task = await getTask(user, parsed.data.taskId);
  if (!task) return { ok: false, message: "Task not found." };

  await db.insert(taskActivity).values({
    taskId: task.id,
    actorId: user.id,
    kind: "comment",
    body: parsed.data.body,
  });

  revalidatePath(`/tasks/${task.id}`);
  return { ok: true };
}
