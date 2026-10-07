/**
 * `pnpm db:seed` — inserts the ten NovaWorks demo accounts (password Demo123!).
 * Re-running never duplicates or modifies existing users.
 */
import { db } from "../src/db";
import { DEMO_USERS } from "../src/db/demo-users";
import { seedDemoUsers } from "../src/db/seed";

async function main() {
  const { inserted } = await seedDemoUsers(db);
  console.log(
    `Demo users ready: ${inserted} inserted, ${DEMO_USERS.length - inserted} already present.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
