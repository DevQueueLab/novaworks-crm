import type { UserRole } from "@/db/schema";

import type { DirectoryMember, PlanDraft, PlanIssue } from "./types";

export type ValidTask = {
  title: string;
  description: string;
  assignee: DirectoryMember;
  dueDate: string;
  estimatedHours: number;
  position: number;
};

export type ValidProject = {
  name: string;
  clientName: string;
  description: string;
  manager: DirectoryMember;
  deadline: string;
  tasks: ValidTask[];
};

export type ValidPlan = {
  meetingTitle: string | null;
  meetingDate: string | null;
  projects: ValidProject[];
  excludedScope: string[];
};

export type ValidationResult =
  | { ok: true; plan: ValidPlan }
  | { ok: false; issues: PlanIssue[] };

const MAX_HOURS = 1000;

const clean = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim() ?? "";

/** True only for real calendar dates written as YYYY-MM-DD. */
export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

const roleLabel: Record<UserRole, string> = {
  admin: "an administrator",
  manager: "a manager",
  agent: "an agent",
};

/**
 * Merges projects the model listed more than once (same client + name) and
 * drops repeated tasks inside a project. Smaller models occasionally echo a
 * project from the recap; this keeps that from blocking an otherwise valid plan.
 */
export function normalizeDraft(draft: PlanDraft): PlanDraft {
  const key = (...parts: (string | null)[]) => parts.map((p) => clean(p).toLowerCase()).join("|");
  const merged = new Map<string, PlanDraft["projects"][number]>();

  for (const project of draft.projects) {
    const id = key(project.clientName, project.name);
    const existing = merged.get(id);
    if (!existing) {
      merged.set(id, { ...project, tasks: [...project.tasks] });
      continue;
    }
    existing.clientName ||= project.clientName;
    existing.managerCode ||= project.managerCode;
    existing.deadline ||= project.deadline;
    existing.description ||= project.description;
    existing.tasks.push(...project.tasks);
  }

  const projects = [...merged.values()].map((project) => {
    const seen = new Set<string>();
    const tasks = project.tasks.filter((task) => {
      const id = key(task.title);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return { ...project, tasks };
  });

  return { ...draft, projects };
}

/**
 * Checks a draft against the business rules and the real team directory.
 * Either every field is valid and a ValidPlan is returned, or nothing is —
 * callers must never persist a partially valid plan.
 */
export function validatePlan(draft: PlanDraft, directory: DirectoryMember[]): ValidationResult {
  const issues: PlanIssue[] = [];
  const byCode = new Map(directory.map((m) => [m.code.toUpperCase(), m]));

  const resolve = (code: string | null, role: UserRole, path: string, what: string) => {
    const key = clean(code).toUpperCase();
    if (!key) {
      issues.push({ path, message: `Choose ${roleLabel[role]} as the ${what}.` });
      return null;
    }
    const member = byCode.get(key);
    if (!member) {
      issues.push({
        path,
        message: `"${clean(code)}" is not in the NovaWorks directory. Choose an existing ${role}.`,
      });
      return null;
    }
    if (member.role !== role) {
      issues.push({
        path,
        message: `${member.name} is ${roleLabel[member.role]}; the ${what} must be ${roleLabel[role]}.`,
      });
      return null;
    }
    return member;
  };

  if (draft.projects.length === 0) {
    issues.push({ path: "projects", message: "No projects were found in the transcript." });
  }

  const seenProjects = new Set<string>();
  const projects: ValidProject[] = [];

  draft.projects.forEach((project, p) => {
    const at = `projects.${p}`;
    const name = clean(project.name);
    const clientName = clean(project.clientName);

    if (!name) issues.push({ path: `${at}.name`, message: "Project name is required." });
    if (!clientName) issues.push({ path: `${at}.clientName`, message: "Client name is required." });

    const projectKey = `${clientName.toLowerCase()}|${name.toLowerCase()}`;
    if (name && clientName && seenProjects.has(projectKey)) {
      issues.push({ path: `${at}.name`, message: `"${name}" appears twice for ${clientName}.` });
    }
    seenProjects.add(projectKey);

    const manager = resolve(project.managerCode, "manager", `${at}.managerCode`, "project manager");

    const deadlineOk = isIsoDate(project.deadline);
    if (!deadlineOk) {
      issues.push({ path: `${at}.deadline`, message: "Project deadline must be a valid date." });
    }

    const seenTasks = new Set<string>();
    const tasks: ValidTask[] = [];

    project.tasks.forEach((task, t) => {
      const tat = `${at}.tasks.${t}`;
      const title = clean(task.title);
      if (!title) issues.push({ path: `${tat}.title`, message: "Task title is required." });
      if (title && seenTasks.has(title.toLowerCase())) {
        issues.push({ path: `${tat}.title`, message: `"${title}" appears twice in this project.` });
      }
      seenTasks.add(title.toLowerCase());

      const assignee = resolve(task.assigneeCode, "agent", `${tat}.assigneeCode`, "task owner");

      const hours = task.estimatedHours;
      const hoursOk = typeof hours === "number" && Number.isFinite(hours) && hours > 0 && hours <= MAX_HOURS;
      if (!hoursOk) {
        issues.push({
          path: `${tat}.estimatedHours`,
          message: `Estimated hours must be a positive number up to ${MAX_HOURS}.`,
        });
      }

      const dueOk = isIsoDate(task.deadline);
      if (!dueOk) {
        issues.push({ path: `${tat}.deadline`, message: "Task deadline must be a valid date." });
      } else if (deadlineOk && task.deadline! > project.deadline!) {
        issues.push({
          path: `${tat}.deadline`,
          message: `Task is due after the project deadline (${project.deadline}).`,
        });
      }

      if (title && assignee && hoursOk && dueOk) {
        tasks.push({
          title,
          description: clean(task.description),
          assignee,
          dueDate: task.deadline!,
          estimatedHours: Math.round(hours * 100) / 100,
          position: t,
        });
      }
    });

    if (name && clientName && manager && deadlineOk) {
      projects.push({
        name,
        clientName,
        description: clean(project.description),
        manager,
        deadline: project.deadline!,
        tasks,
      });
    }
  });

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    plan: {
      meetingTitle: clean(draft.meetingTitle) || null,
      meetingDate: isIsoDate(draft.meetingDate) ? draft.meetingDate : null,
      projects,
      excludedScope: draft.excludedScope.map(clean).filter(Boolean),
    },
  };
}
