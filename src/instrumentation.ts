/**
 * Runs once when the Next.js server starts, before it serves any request:
 * applies pending migrations and makes sure the ten demo accounts exist.
 * Both steps are idempotent, so restarts and redeploys are safe.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[startup] DATABASE_URL is not set — skipping migrations and seeding.");
    return;
  }

  const { runMigrations } = await import("./db/migrate");
  const { seedDemoUsers } = await import("./db/seed");
  const { db } = await import("./db");

  await runMigrations(databaseUrl);
  const { inserted } = await seedDemoUsers(db);
  console.log(`[startup] database ready — ${inserted} demo user(s) inserted.`);
}
