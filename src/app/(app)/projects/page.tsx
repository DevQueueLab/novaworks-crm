import { FileText, FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { requireUser, type SessionUser } from "@/lib/auth/dal";
import { listProjects } from "@/lib/data/projects";

export const metadata: Metadata = { title: "Projects" };

const copy: Record<SessionUser["role"], { title: string; description: string; empty: string }> = {
  admin: {
    title: "All projects",
    description: "Every client project across NovaWorks, soonest deadline first.",
    empty: "Paste a meeting transcript and the AI will create projects, owners, deadlines and estimates.",
  },
  manager: {
    title: "My projects",
    description: "Projects you manage. Task counts and hours cover your whole team’s work.",
    empty: "When an admin makes you the manager of a project, it shows up here.",
  },
  agent: {
    title: "Projects I’m on",
    description: "Projects where you own at least one task. Counts and hours reflect only your tasks.",
    empty: "Once you’re assigned a task, the project it belongs to shows up here.",
  },
};

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listProjects(user);
  const text = copy[user.role];
  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={text.title}
        count={projects.length}
        description={text.description}
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/import">
                <FileText />
                Create from transcript
              </Link>
            </Button>
          ) : null
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={text.empty}
          action={null}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
