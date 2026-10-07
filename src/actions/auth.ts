"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyDecoy, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";

export type LoginState = { error?: string; email?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = credentials.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password.", email };

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const valid = user
    ? await verifyPassword(user.passwordHash, parsed.data.password)
    : await verifyDecoy(parsed.data.password);
  if (!user || !valid) return { error: "Invalid email or password.", email };

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
