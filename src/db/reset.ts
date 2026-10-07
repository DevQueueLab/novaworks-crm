import { db } from "./index";
import { clients, meetings, projects, tasks } from "./schema";

/** Removes every generated record (meetings, clients, projects, tasks); users stay. */
export async function resetGeneratedData() {
  await db.transaction(async (tx) => {
    await tx.delete(tasks);
    await tx.delete(projects);
    await tx.delete(clients);
    await tx.delete(meetings);
  });
}
