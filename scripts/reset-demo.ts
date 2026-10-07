/**
 * `pnpm db:reset-demo` — deletes generated meetings, clients, projects and tasks
 * so the transcript flow can be demonstrated again. Seeded users are kept.
 */
import { resetGeneratedData } from "../src/db/reset";

resetGeneratedData()
  .then(() => {
    console.log("Generated projects and tasks removed; demo users kept.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
