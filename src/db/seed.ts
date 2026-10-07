import { hashPassword } from "@/lib/auth/password";

import type { Database } from "./index";
import { DEMO_PASSWORD, DEMO_USERS } from "./demo-users";
import { users } from "./schema";

/**
 * Inserts any demo account whose email is not present yet. Safe to run on every
 * boot: existing users (and their passwords) are never touched or duplicated.
 */
export async function seedDemoUsers(db: Database) {
  const existing = new Set(
    (await db.select({ email: users.email }).from(users)).map((u) => u.email),
  );
  const missing = DEMO_USERS.filter((u) => !existing.has(u.email));
  if (missing.length === 0) return { inserted: 0 };

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const inserted = await db
    .insert(users)
    .values(missing.map((u) => ({ ...u, passwordHash })))
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });

  return { inserted: inserted.length };
}
