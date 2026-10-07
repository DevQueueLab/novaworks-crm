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
