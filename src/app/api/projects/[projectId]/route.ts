import { getCurrentUser } from "@/lib/auth/dal";
import { getProject } from "@/lib/data/projects";

/**
 * A single project with the tasks the user may see. Projects outside the
 * user's scope answer 404 — indistinguishable from projects that don't exist.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { projectId } = await params;
  const project = await getProject(user, projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  return Response.json({ project });
}
