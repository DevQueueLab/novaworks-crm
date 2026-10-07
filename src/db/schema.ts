import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ApplySummary } from "@/lib/planning/types";

export const userRole = pgEnum("user_role", ["admin", "manager", "agent"]);
export type UserRole = (typeof userRole.enumValues)[number];

export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "in_review", "done"]);
export type TaskStatus = (typeof taskStatus.enumValues)[number];

export const activityKind = pgEnum("activity_kind", ["comment", "status_change", "edit"]);
export type ActivityKind = (typeof activityKind.enumValues)[number];

/** Extra data for non-comment activity: a status move or the list of edited fields. */
export type ActivityMeta = { from?: TaskStatus; to?: TaskStatus; fields?: string[] };

/** Time-ordered UUIDs (native in PostgreSQL 18) keep primary-key indexes compact. */
const primaryId = () => uuid("id").primaryKey().default(sql`uuidv7()`);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable(
  "users",
  {
    id: primaryId(),
    /** Stable directory reference (e.g. PM01, DEV03). The AI only ever sees these codes. */
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    /** Specialization shown in the team directory, e.g. "Web PM" or "Full-Stack". */
    title: text("title").notNull(),
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    /** Set by an admin to block sign-in while keeping the user's history. */
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Composite key that role-checked foreign keys (manager / assignee) point at.
    unique("users_id_role_key").on(t.id, t.role),
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("users_code_format", sql`${t.code} ~ '^[A-Z0-9]+$'`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token; the raw token only ever lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const clients = pgTable(
  "clients",
  {
    id: primaryId(),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("clients_name_key").on(sql`lower(${t.name})`)],
);

/** Every transcript that produced or changed records — provenance for projects. */
export const meetings = pgTable("meetings", {
  id: primaryId(),
  title: text("title"),
  heldOn: date("held_on", { mode: "string" }),
  transcript: text("transcript").notNull(),
  model: text("model").notNull(),
  summary: jsonb("summary").$type<ApplySummary>(),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export const projects = pgTable(
  "projects",
  {
    id: primaryId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    managerId: uuid("manager_id").notNull(),
    /** Pinned to 'manager' so the database itself rejects a non-manager owner. */
    managerRole: userRole("manager_role").notNull().default("manager"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    deadline: date("deadline", { mode: "string" }).notNull(),
    sourceMeetingId: uuid("source_meeting_id").references(() => meetings.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "projects_manager_fk",
      columns: [t.managerId, t.managerRole],
      foreignColumns: [users.id, users.role],
    }),
    check("projects_manager_role_check", sql`${t.managerRole} = 'manager'`),
    uniqueIndex("projects_client_name_key").on(t.clientId, sql`lower(${t.name})`),
    index("projects_manager_id_idx").on(t.managerId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: primaryId(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assigneeId: uuid("assignee_id").notNull(),
    /** Pinned to 'agent' so the database itself rejects a non-agent assignee. */
    assigneeRole: userRole("assignee_role").notNull().default("agent"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    estimatedHours: numeric("estimated_hours", {
      precision: 6,
      scale: 2,
      mode: "number",
    }).notNull(),
    /** Order in which the meeting introduced the task. */
    position: smallint("position").notNull().default(0),
    status: taskStatus("status").notNull().default("todo"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "tasks_assignee_fk",
      columns: [t.assigneeId, t.assigneeRole],
      foreignColumns: [users.id, users.role],
    }),
    check("tasks_assignee_role_check", sql`${t.assigneeRole} = 'agent'`),
    check("tasks_estimated_hours_positive", sql`${t.estimatedHours} > 0`),
    uniqueIndex("tasks_project_title_key").on(t.projectId, sql`lower(${t.title})`),
    index("tasks_assignee_id_idx").on(t.assigneeId),
  ],
);

/** Workspace-wide settings an admin can change at runtime (exactly one row, id = 1). */
export const appSettings = pgTable(
  "app_settings",
  {
    id: smallint("id").primaryKey().default(1),
    companyName: text("company_name").notNull().default("NovaWorks Technologies"),
    /** OpenRouter model id; null falls back to AI_MODEL / the built-in default. */
    aiModel: text("ai_model"),
    /** Comma-separated OpenRouter fallbacks; null falls back to AI_FALLBACK_MODELS. */
    aiFallbackModels: text("ai_fallback_models"),
    updatedById: uuid("updated_by_id").references(() => users.id),
    updatedAt: updatedAt(),
  },
  (t) => [check("app_settings_singleton", sql`${t.id} = 1`)],
);

export const channelKind = pgEnum("channel_kind", ["general", "project", "custom"]);
export type ChannelKind = (typeof channelKind.enumValues)[number];

/**
 * Team chat channels. `general` and `custom` channels are open to everyone;
 * a `project` channel belongs to one project and follows that project's access
 * rules (admin, its manager, and agents with a task in it).
 */
export const channels = pgTable(
  "channels",
  {
    id: primaryId(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    kind: channelKind("kind").notNull(),
    projectId: uuid("project_id")
      .unique()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("channels_project_kind", sql`(${t.kind} = 'project') = (${t.projectId} is not null)`),
    check("channels_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{0,62}$'`),
  ],
);

export const channelMessages = pgTable(
  "channel_messages",
  {
    id: primaryId(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("channel_messages_channel_idx").on(t.channelId, t.createdAt),
    check("channel_messages_body_length", sql`length(${t.body}) between 1 and 4000`),
  ],
);

/** The task's communication channel: comments plus an audit trail of moves and edits. */
export const taskActivity = pgTable(
  "task_activity",
  {
    id: primaryId(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    kind: activityKind("kind").notNull(),
    body: text("body"),
    meta: jsonb("meta").$type<ActivityMeta>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("task_activity_task_idx").on(t.taskId, t.createdAt),
    check(
      "task_activity_comment_body",
      sql`${t.kind} <> 'comment' or (${t.body} is not null and length(${t.body}) between 1 and 4000)`,
    ),
  ],
);
