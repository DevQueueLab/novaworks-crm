import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Clock,
  FileText,
  FolderKanban,
  ListChecks,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { UserAvatar } from "@/components/people";
import { ProjectCard } from "@/components/projects/project-card";
import { DeadlineChip } from "@/components/projects/task-list";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { requireUser, type SessionUser } from "@/lib/auth/dal";
import { listProjects, type ProjectSummary } from "@/lib/data/projects";
import { listTasks, type TaskListItem } from "@/lib/data/tasks";
import { listTeam } from "@/lib/data/team";
import { daysUntil, formatHours, formatShortDate, relativeDeadline, todayIso } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const workingDays = (hours: number) => Math.ceil(hours / 8);
const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
/** Hide supporting copy that would only restate a zero ("for 0 clients"). */
const when = (condition: boolean, hint: ReactNode) => (condition ? hint : undefined);

const weekdayDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Functional header: "Overview" plus today's date in Lahore. */
function OverviewHeader({ actions }: { actions?: ReactNode }) {
  const today = todayIso();
  return (
    <PageHeader
      title="Overview"
      description={<time dateTime={today}>{weekdayDate.format(new Date(`${today}T00:00:00Z`))}</time>}
      actions={actions}
    />
  );
}

export default async function HomePage() {
  const user = await requireUser();
  if (user.role === "admin") return <AdminHome user={user} />;
  if (user.role === "manager") return <ManagerHome user={user} />;
  return <AgentHome user={user} />;
}

/* Admin */

async function AdminHome({ user }: { user: SessionUser }) {
  const [projects, team] = await Promise.all([listProjects(user), listTeam()]);

  const taskCount = projects.reduce((sum, p) => sum + p.taskCount, 0);
  const hours = projects.reduce((sum, p) => sum + p.totalHours, 0);
  const clients = new Set(projects.map((p) => p.client)).size;
  const owners = new Set(projects.flatMap((p) => p.assignees.map((a) => a.id))).size;
  const managers = team.filter((m) => m.role === "manager").length;
  const agents = team.filter((m) => m.role === "agent").length;
  const shown = projects.slice(0, 6);

  return (
    <div className="space-y-8">
      <OverviewHeader
        actions={
          <Button asChild>
            <Link href="/import">
              <FileText />
              Create from transcript
            </Link>
          </Button>
        }
      />

      <StatGrid>
        <StatCard
          label="Projects"
          value={projects.length}
          hint={when(clients > 0, `for ${plural(clients, "client")}`)}
          icon={FolderKanban}
        />
        <StatCard
          label="Tasks"
          value={taskCount}
          hint={when(owners > 0, owners === 1 ? "owned by 1 person" : `owned by ${owners} people`)}
          icon={ListChecks}
        />
        <StatCard
          label="Estimated hours"
          value={formatHours(hours)}
          hint={when(hours > 0, `≈ ${plural(workingDays(hours), "working day")}`)}
          icon={Clock}
        />
        <StatCard
          label="Team members"
          value={team.length}
          hint={when(team.length > 0, `${plural(managers, "manager")} · ${plural(agents, "agent")}`)}
          icon={Users}
        />
      </StatGrid>

      {projects.length === 0 ? (
        <GettingStarted />
      ) : (
        <section className="space-y-4">
          <SectionHeading
            title="Projects"
            description="Soonest deadline first."
            action={
              projects.length > shown.length ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/projects">
                    View all {projects.length}
                    <ArrowRight />
                  </Link>
                </Button>
              ) : null
            }
          />
          <ProjectGrid projects={shown} />
        </section>
      )}
    </div>
  );
}

const steps = [
  { label: "Paste", text: "Drop in the raw transcript from any client or internal meeting." },
  { label: "Review", text: "The AI drafts projects, owners, deadlines and hour estimates." },
  { label: "Ship", text: "Approve the plan and your team sees exactly what they own." },
];

/** Plain first-run state. The header and sidebar already carry the action. */
function GettingStarted() {
  return (
    <section
      aria-labelledby="getting-started"
      className="rounded-xl border border-dashed bg-card/40 px-6 py-7 sm:px-8"
    >
      <h2 id="getting-started" className="text-base leading-7 font-semibold tracking-tight">
        No projects yet
      </h2>
      <p className="mt-1 max-w-[62ch] text-sm leading-6 text-muted-foreground">
        Projects, owners, deadlines and estimates appear here once you create them from a meeting transcript.
      </p>
      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <li key={step.label} className="flex gap-3 text-sm leading-6">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <span>
              <span className="font-medium text-foreground">{step.label}.</span>{" "}
              <span className="text-muted-foreground">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* Manager */

async function ManagerHome({ user }: { user: SessionUser }) {
  const projects = await listProjects(user);

  const taskCount = projects.reduce((sum, p) => sum + p.taskCount, 0);
  const hours = projects.reduce((sum, p) => sum + p.totalHours, 0);
  const next = projects.find((p) => daysUntil(p.deadline) >= 0) ?? projects[0];

  return (
    <div className="space-y-8">
      <OverviewHeader />

      <StatGrid>
        <StatCard
          label="Projects"
          value={projects.length}
          hint={when(projects.length > 0, "you manage")}
          icon={FolderKanban}
        />
        <StatCard
          label="Tasks"
          value={taskCount}
          hint={when(taskCount > 0, "across your team")}
          icon={ListChecks}
        />
        <StatCard
          label="Hours"
          value={formatHours(hours)}
          hint={when(hours > 0, `≈ ${plural(workingDays(hours), "working day")}`)}
          icon={Clock}
        />
        <StatCard
          label="Next deadline"
          value={next ? formatShortDate(next.deadline) : "None"}
          hint={next ? <NextHint date={next.deadline} label={next.name} /> : undefined}
          icon={CalendarClock}
        />
      </StatGrid>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects assigned yet"
          description="When an admin creates a project from a meeting and makes you its manager, it shows up here."
        />
      ) : (
        <section className="space-y-4">
          <SectionHeading title="Your projects" description="Soonest deadline first." />
          <ProjectGrid projects={projects} />
        </section>
      )}
    </div>
  );
}

/* Agent */

type ProjectGroup = { project: TaskListItem["project"]; tasks: TaskListItem[]; hours: number };

function groupByProject(tasks: TaskListItem[]): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>();
  for (const task of tasks) {
    const group = groups.get(task.project.id) ?? { project: task.project, tasks: [], hours: 0 };
    group.tasks.push(task);
    group.hours += task.estimatedHours;
    groups.set(task.project.id, group);
  }
  return [...groups.values()];
}

async function AgentHome({ user }: { user: SessionUser }) {
  const tasks = await listTasks(user);

  const hours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const next = tasks.find((t) => daysUntil(t.dueDate) >= 0) ?? tasks[0];
  const groups = groupByProject(tasks);

  return (
    <div className="space-y-8">
      <OverviewHeader />

      <StatGrid className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-3">
        <StatCard
          label="Assigned tasks"
          value={tasks.length}
          hint={when(groups.length > 0, `across ${plural(groups.length, "project")}`)}
          icon={ListChecks}
        />
        <StatCard
          label="Estimated hours"
          value={formatHours(hours)}
          hint={when(hours > 0, `≈ ${plural(workingDays(hours), "working day")}`)}
          icon={Clock}
        />
        <StatCard
          label="Next due date"
          value={next ? formatShortDate(next.dueDate) : "None"}
          hint={next ? <NextHint date={next.dueDate} label={next.title} /> : undefined}
          icon={CalendarClock}
        />
      </StatGrid>

      {groups.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks assigned yet"
          description="When a manager assigns you work from a meeting, your tasks and deadlines show up here."
        />
      ) : (
        <section className="space-y-4">
          <SectionHeading title="My tasks by project" description="Soonest due first." />
          <div className="space-y-4">
            {groups.map((group) => (
              <ProjectTaskGroup key={group.project.id} group={group} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProjectTaskGroup({ group }: { group: ProjectGroup }) {
  const { project, tasks, hours } = group;
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{project.client}</span>
          </div>
          <Link
            href={`/projects/${project.id}`}
            className="group mt-0.5 inline-flex items-center gap-1 rounded-sm font-semibold tracking-tight outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {project.name}
            <ArrowUpRight className="size-4 text-muted-foreground/60 transition-[translate,color] duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserAvatar name={project.manager} size="sm" />
            <span>
              Manager <span className="font-medium text-foreground">{project.manager}</span>
            </span>
          </span>
          <span className="tabular-nums">
            {plural(tasks.length, "task")}, {formatHours(hours)}
          </span>
        </div>
      </div>
      <ul className="divide-y">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
          >
            <div className="min-w-0">
              <div className="font-medium leading-snug">{task.title}</div>
              {task.description && (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground text-pretty">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2.5 text-sm tabular-nums">
              <span className="text-muted-foreground">{formatShortDate(task.dueDate)}</span>
              <DeadlineChip date={task.dueDate} />
              <span className="min-w-9 text-right font-medium">{formatHours(task.estimatedHours)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Shared */

function NextHint({ date, label }: { date: string; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="shrink-0">{relativeDeadline(date)}:</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base leading-7 font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ProjectGrid({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
