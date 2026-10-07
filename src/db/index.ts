import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

// postgres.js connects lazily, so importing this module never opens a connection
// (important during `next build`, where no database is available).
const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL ?? "", {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle({ client, schema });
export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
