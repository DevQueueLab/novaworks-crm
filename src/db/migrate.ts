import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Applies pending SQL migrations from ./drizzle using a short-lived connection. */
export async function runMigrations(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle({ client }), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
  } finally {
    await client.end();
  }
}
