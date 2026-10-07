"use server";

import { eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { appSettings, sessions, users, type UserRole } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";

/*
 * Admin console actions. Every one re-reads the caller from the session cookie
 * and checks the admin role; nothing in the input is trusted. Results never
 * include password hashes or the OpenRouter key.
 */

export type AdminActionResult = { ok: true; message: string } | { ok: false; message: string };

export type AiConnectionResult =
  | {
      ok: true;
      label: string;
      usage: number;
      limit: number | null;
      limitRemaining: number | null;
      isFreeTier: boolean;
    }
  | { ok: false; message: string };

const FORBIDDEN = { ok: false, message: "Only the administrator can do this." } as const;
const NOT_FOUND = { ok: false, message: "That user no longer exists. Refresh the page." } as const;

const DEFAULT_TITLES: Record<UserRole, string> = {
  admin: "Administrator",
  manager: "Project manager",
  agent: "Developer",
};

const ROLE_PHRASE: Record<UserRole, string> = {
  admin: "an admin",
  manager: "a manager",
  agent: "an agent",
};

/** Directory code prefixes: ADMIN2, PM04, DEV07. */
const CODE_FORMAT: Record<UserRole, { prefix: string; pad: number }> = {
  admin: { prefix: "ADMIN", pad: 1 },
  manager: { prefix: "PM", pad: 2 },
  agent: { prefix: "DEV", pad: 2 },
};

const idSchema = z.uuid("Unknown user.");
const roleSchema = z.enum(["admin", "manager", "agent"]);
const nameSchema = z.string().trim().min(1, "Name is required.").max(100, "Name is too long.");
const titleSchema = z.string().trim().max(60, "Specialization is too long.");
const skillsSchema = z.string().max(600, "That is too many skills.");
const passwordSchema = z
  .string()
  .min(8, "Passwords need at least 8 characters.")
  .max(128, "Passwords can be at most 128 characters.");
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address.");

const createSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
  title: titleSchema,
  skills: skillsSchema,
  code: z
    .string()
    .trim()
    .toUpperCase()
    .max(12, "Codes can be at most 12 characters.")
    .regex(/^[A-Z0-9]*$/, "Codes use letters and numbers only.")
    .optional(),
  password: passwordSchema,
});

const updateSchema = z.object({
  id: idSchema,
  name: nameSchema,
  title: titleSchema,
  skills: skillsSchema,
  role: roleSchema,
});

const activeSchema = z.object({ id: idSchema, active: z.boolean() });
const passwordResetSchema = z.object({ id: idSchema, password: passwordSchema });

const settingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required.").max(80, "Company name is too long.").optional(),
  aiModel: z
    .string()
    .trim()
    .max(200, "Model id is too long.")
    .regex(/^[^\s,]*$/, "Enter one model id, like openai/gpt-4o-mini.")
    .optional(),
  aiFallbackModels: z.string().max(1000, "Too many fallback models.").optional(),
});

export type CreateUserInput = z.input<typeof createSchema>;
export type UpdateUserInput = z.input<typeof updateSchema>;
export type UpdateSettingsInput = z.input<typeof settingsSchema>;

/** Admin check from the session, never from anything the client sends. */
async function currentAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

/** Postgres SQLSTATE, also when the driver error is wrapped (drizzle sets it as `cause`). */
function pgCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && typeof current === "object" && current !== null; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** "React, APIs , react,, Testing" → ["React", "APIs", "Testing"] */
function parseSkills(raw: string) {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const part of raw.split(",")) {
    const skill = part.trim().replace(/\s+/g, " ").slice(0, 40);
    const key = skill.toLowerCase();
    if (!skill || seen.has(key)) continue;
    seen.add(key);
    skills.push(skill);
  }
  return skills.slice(0, 12);
}

/** Next free directory code for the role. The seeded "ADMIN" counts as number 1. */
async function nextCode(role: UserRole) {
  const { prefix, pad } = CODE_FORMAT[role];
  const rows = await db.select({ code: users.code }).from(users).where(like(users.code, `${prefix}%`));
  let highest = 0;
  for (const { code } of rows) {
    const rest = code.slice(prefix.length);
    if (rest === "") highest = Math.max(highest, 1);
    else if (/^\d+$/.test(rest)) highest = Math.max(highest, Number(rest));
  }
  return `${prefix}${String(highest + 1).padStart(pad, "0")}`;
}

export async function createUser(input: CreateUserInput): Promise<AdminActionResult> {
  const admin = await currentAdmin();
  if (!admin) return FORBIDDEN;

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { name, email, role, password } = parsed.data;
  const code = parsed.data.code || (await nextCode(role));

  const [taken] = await db
    .select({ email: users.email })
    .from(users)
    .where(or(eq(users.email, email), eq(users.code, code)))
    .limit(1);
  if (taken) {
    return {
      ok: false,
      message: taken.email === email ? "That email is already in use." : `The code ${code} is already taken.`,
    };
  }

  try {
    await db.insert(users).values({
      code,
      name,
      email,
      role,
      title: parsed.data.title || DEFAULT_TITLES[role],
      skills: parseSkills(parsed.data.skills),
      passwordHash: await hashPassword(password),
    });
  } catch (error) {
    if (pgCode(error) === "23505") return { ok: false, message: "Email or code already in use." };
    console.error("[createUser]", error);
    return { ok: false, message: "Could not create the user. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: `${name} (${code}) can now sign in as ${email}.` };
}

export async function updateUser(input: UpdateUserInput): Promise<AdminActionResult> {
  const admin = await currentAdmin();
  if (!admin) return FORBIDDEN;

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { id, name, role } = parsed.data;

  if (id === admin.id && role !== "admin") {
    return { ok: false, message: "You can't change your own role. Ask another admin to do it." };
  }

  const [current] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!current) return NOT_FOUND;

  try {
    await db
      .update(users)
      .set({
        name,
        role,
        title: parsed.data.title || DEFAULT_TITLES[role],
        skills: parseSkills(parsed.data.skills),
      })
      .where(eq(users.id, id));
  } catch (error) {
    // projects.manager_id and tasks.assignee_id point at users(id, role).
    if (pgCode(error) === "23503") {
      return { ok: false, message: "Reassign their projects/tasks before changing the role." };
    }
    console.error("[updateUser]", error);
    return { ok: false, message: "Could not save the changes. Please try again." };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: role !== current.role ? `${name} is now ${ROLE_PHRASE[role]}.` : `${name} was updated.`,
  };
}

/** Deactivating blocks sign-in and ends every session; history stays intact. */
export async function setUserActive(input: { id: string; active: boolean }): Promise<AdminActionResult> {
  const admin = await currentAdmin();
  if (!admin) return FORBIDDEN;

  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { id, active } = parsed.data;

  if (id === admin.id && !active) return { ok: false, message: "You can't deactivate your own account." };

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(users)
      .set({ deactivatedAt: active ? null : new Date() })
      .where(eq(users.id, id))
      .returning({ name: users.name });
    if (rows.length > 0 && !active) await tx.delete(sessions).where(eq(sessions.userId, id));
    return rows.at(0);
  });
  if (!updated) return NOT_FOUND;

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: active
      ? `${updated.name} can sign in again.`
      : `${updated.name} was signed out everywhere and can no longer sign in.`,
  };
}

/** Sets a new password and signs the user out on every device. */
export async function resetUserPassword(input: { id: string; password: string }): Promise<AdminActionResult> {
  const admin = await currentAdmin();
  if (!admin) return FORBIDDEN;

  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { id, password } = parsed.data;

  if (id === admin.id) {
    return { ok: false, message: "You can't reset your own password here." };
  }

  const passwordHash = await hashPassword(password);
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning({ name: users.name });
    if (rows.length > 0) await tx.delete(sessions).where(eq(sessions.userId, id));
    return rows.at(0);
  });
  if (!updated) return NOT_FOUND;

  revalidatePath("/admin/users");
  return { ok: true, message: `${updated.name} was signed out everywhere and must use the new password.` };
}

/** Upserts the singleton settings row. Only the fields that are sent change; empty AI fields become null. */
export async function updateSettings(input: UpdateSettingsInput): Promise<AdminActionResult> {
  const admin = await currentAdmin();
  if (!admin) return FORBIDDEN;

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { companyName, aiModel, aiFallbackModels } = parsed.data;

  let fallbacks: string | null | undefined;
  if (aiFallbackModels !== undefined) {
    const models = [...new Set(aiFallbackModels.split(",").map((m) => m.trim()).filter(Boolean))];
    if (models.some((m) => /\s/.test(m) || m.length > 200)) {
      return { ok: false, message: "Separate fallback model ids with commas, without spaces inside an id." };
    }
    if (models.length > 10) return { ok: false, message: "Use at most 10 fallback models." };
    fallbacks = models.length > 0 ? models.join(",") : null;
  }

  if (companyName === undefined && aiModel === undefined && fallbacks === undefined) {
    return { ok: false, message: "Nothing to save." };
  }

  const changes: {
    companyName?: string;
    aiModel?: string | null;
    aiFallbackModels?: string | null;
    updatedById: string;
    updatedAt: Date;
  } = { updatedById: admin.id, updatedAt: new Date() };
  if (companyName !== undefined) changes.companyName = companyName;
  if (aiModel !== undefined) changes.aiModel = aiModel || null;
  if (fallbacks !== undefined) changes.aiFallbackModels = fallbacks;

  try {
    await db
      .insert(appSettings)
      .values({ id: 1, ...changes })
      .onConflictDoUpdate({ target: appSettings.id, set: changes });
  } catch (error) {
    console.error("[updateSettings]", error);
    return { ok: false, message: "Could not save the settings. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

const keyInfoSchema = z.object({
  data: z.object({
    label: z.string().nullish(),
    usage: z.number().nullish(),
    limit: z.number().nullish(),
    limit_remaining: z.number().nullish(),
    is_free_tier: z.boolean().nullish(),
  }),
});

/** Checks the server's OpenRouter key and credit. The key itself never leaves the server. */
export async function testAiConnection(): Promise<AiConnectionResult> {
  const admin = await currentAdmin();
  if (!admin) return FORBIDDEN;

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return { ok: false, message: "OPENROUTER_API_KEY is not set on the server." };

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const name = typeof error === "object" && error !== null ? (error as { name?: unknown }).name : undefined;
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, message: "OpenRouter did not answer within 10 seconds. Try again." };
    }
    return { ok: false, message: "Could not reach OpenRouter. Check the server's network access." };
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: "OpenRouter rejected the API key. Check OPENROUTER_API_KEY." };
  }
  if (response.status === 429) {
    return { ok: false, message: "OpenRouter is rate limiting this key. Wait a minute and try again." };
  }
  if (!response.ok) {
    return { ok: false, message: `OpenRouter returned an error (HTTP ${response.status}). Try again shortly.` };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const parsed = keyInfoSchema.safeParse(body);
  if (!parsed.success) return { ok: false, message: "OpenRouter sent a response that could not be read." };

  const info = parsed.data.data;
  const usage = info.usage ?? 0;
  const limit = typeof info.limit === "number" ? info.limit : null;
  const limitRemaining =
    typeof info.limit_remaining === "number"
      ? info.limit_remaining
      : limit !== null
        ? Math.max(0, limit - usage)
        : null;
  // OpenRouter labels are already masked; never echo anything containing the raw key.
  const label = info.label && !info.label.includes(apiKey) ? info.label : "Server API key";

  return { ok: true, label, usage, limit, limitRemaining, isFreeTier: info.is_free_tier ?? false };
}
