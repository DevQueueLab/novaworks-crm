import { getCurrentUser } from "@/lib/auth/dal";
import { listTasks } from "@/lib/data/tasks";

/** Tasks the signed-in user may see (agents: only their own). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  return Response.json({ tasks: await listTasks(user) });
}
