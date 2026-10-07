import { getCurrentUser } from "@/lib/auth/dal";
import { listProjects } from "@/lib/data/projects";

/** Projects the signed-in user may see — the same rules as the UI, enforced in SQL. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  return Response.json({ projects: await listProjects(user) });
}
