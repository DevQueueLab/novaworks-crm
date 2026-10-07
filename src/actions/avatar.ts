"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { removeAvatar, saveAvatar } from "@/lib/avatar";

/*
 * Profile photo actions. The caller always comes from the session cookie: people
 * change their own photo, and only the admin (role read from the session, never
 * from the input) may change someone else's.
 */

export type AvatarActionResult = { ok: true } | { ok: false; message: string };

const SIGNED_OUT = { ok: false, message: "Your session has expired. Please sign in again." } as const;
const FORBIDDEN = { ok: false, message: "Only the administrator can change other people's photos." } as const;
const NOT_FOUND = { ok: false, message: "That user no longer exists. Refresh the page." } as const;
const NO_FILE = { ok: false, message: "Choose an image to upload." } as const;

const idSchema = z.uuid();

function fileFrom(formData: FormData): Blob | null {
  const value = formData instanceof FormData ? formData.get("file") : null;
  return value instanceof Blob ? value : null;
}

/** Admin target check: a well-formed id that belongs to an existing user. */
async function existingUserId(userId: unknown): Promise<string | null> {
  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) return null;
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, parsed.data.toLowerCase()))
    .limit(1);
  return target?.id ?? null;
}

/** Replaces the signed-in user's photo with the "file" field. */
export async function uploadMyAvatar(formData: FormData): Promise<AvatarActionResult> {
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;

  const file = fileFrom(formData);
  if (!file) return NO_FILE;

  const result = await saveAvatar(user.id, file);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Removes the signed-in user's photo. */
export async function removeMyAvatar(): Promise<AvatarActionResult> {
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;

  await removeAvatar(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Admin only: replaces another user's photo with the "file" field. */
export async function setUserAvatar(userId: string, formData: FormData): Promise<AvatarActionResult> {
  const admin = await getCurrentUser();
  if (!admin) return SIGNED_OUT;
  if (admin.role !== "admin") return FORBIDDEN;

  const targetId = await existingUserId(userId);
  if (!targetId) return NOT_FOUND;

  const file = fileFrom(formData);
  if (!file) return NO_FILE;

  const result = await saveAvatar(targetId, file);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Admin only: removes another user's photo. */
export async function clearUserAvatar(userId: string): Promise<AvatarActionResult> {
  const admin = await getCurrentUser();
  if (!admin) return SIGNED_OUT;
  if (admin.role !== "admin") return FORBIDDEN;

  const targetId = await existingUserId(userId);
  if (!targetId) return NOT_FOUND;

  await removeAvatar(targetId);
  revalidatePath("/", "layout");
  return { ok: true };
}
