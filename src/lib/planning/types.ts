import { z } from "zod";

import type { UserRole } from "@/db/schema";

/*
 * The plan draft is the contract between the AI and the application. The model
 * fills it from the transcript; the admin may correct it; the validator turns it
 * into a ValidPlan before anything is written. Unknown values are `null` (never
 * guessed) so strict structured output can still represent "not agreed".
 */

const draftTaskSchema = z.object({
  title: z.string().describe("Task name exactly as agreed in the meeting"),
  description: z
    .string()
    .describe("One or two sentences of task scope, including agreed boundaries"),
  assigneeCode: z
    .string()
    .nullable()
    .describe("Directory code of the agent who owns the task, or null if no owner was agreed"),
  deadline: z
    .string()
    .nullable()
    .describe("Final agreed task deadline as YYYY-MM-DD, or null"),
  estimatedHours: z
    .number()
    .nullable()
    .describe("Final agreed developer effort in hours (not calendar time), or null"),
});

const draftProjectSchema = z.object({
  name: z.string().describe("Project name as used in the meeting"),
  clientName: z
    .string()
    .nullable()
    .describe("Client organisation the project is for, or null if not stated"),
  description: z
    .string()
    .describe("Two or three sentences of scope, stating what is explicitly excluded"),
  managerCode: z
    .string()
    .nullable()
    .describe("Directory code of the project manager, or null if not agreed"),
  deadline: z
    .string()
    .nullable()
    .describe("Final agreed project delivery date as YYYY-MM-DD, or null"),
  tasks: z.array(draftTaskSchema),
});

export const planDraftSchema = z.object({
  meetingTitle: z.string().nullable().describe("Meeting title if stated"),
  meetingDate: z.string().nullable().describe("Meeting date as YYYY-MM-DD if stated"),
  projects: z.array(draftProjectSchema),
  excludedScope: z
    .array(z.string())
    .describe("Rejected, deferred or out-of-scope work deliberately NOT turned into tasks"),
  openQuestions: z
    .array(z.string())
    .describe("Required details (owner, date, estimate, client) the transcript did not resolve"),
});

export type PlanDraft = z.infer<typeof planDraftSchema>;
export type DraftProject = PlanDraft["projects"][number];
export type DraftTask = DraftProject["tasks"][number];

/** A blocking problem with a draft field; `path` mirrors the draft, e.g. `projects.0.tasks.2.deadline`. */
export type PlanIssue = { path: string; message: string };

/** What the AI (and the correction form) may reference. Never includes emails or passwords. */
export type DirectoryMember = {
  id: string;
  code: string;
  name: string;
  role: UserRole;
  title: string;
  skills: string[];
};

export type ChangeOutcome = "created" | "updated" | "unchanged";

export type FieldChange = {
  field: "client" | "manager" | "deadline" | "assignee" | "dueDate" | "estimatedHours";
  from: string;
  to: string;
};

export type AppliedTask = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  estimatedHours: number;
  outcome: ChangeOutcome;
  changes: FieldChange[];
};

export type AppliedProject = {
  id: string;
  name: string;
  client: string;
  manager: string;
  deadline: string;
  outcome: ChangeOutcome;
  changes: FieldChange[];
  tasks: AppliedTask[];
  /** Existing tasks this transcript did not mention; they are kept as they were. */
  untouchedTaskCount: number;
};

export type ApplySummary = {
  meetingId: string;
  projects: AppliedProject[];
  counts: {
    projectsCreated: number;
    projectsUpdated: number;
    projectsUnchanged: number;
    tasksCreated: number;
    tasksUpdated: number;
    tasksUnchanged: number;
  };
  totalHours: number;
  excludedScope: string[];
};

export type ImportResult =
  | { status: "applied"; summary: ApplySummary; model: string }
  | { status: "needs_review"; draft: PlanDraft; issues: PlanIssue[]; model: string }
  | { status: "error"; message: string };
