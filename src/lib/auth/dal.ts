import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getSessionUser, type SessionUser } from "./session";

/*
 * Data Access Layer entry point. The current user always comes from the
 * session cookie — never from a role or id supplied by the caller — and every
 * page, action and route handler asks here before touching data.
 */

/** One session lookup per request, however many components ask. */
export const getCurrentUser = cache(getSessionUser);

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export type { SessionUser };
