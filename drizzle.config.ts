import { defineConfig } from "drizzle-kit";

// Same file `next dev` reads; optional so CI/servers can pass DATABASE_URL directly.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
