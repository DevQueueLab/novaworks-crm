import "server-only";

import { asc, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { meetings, users } from "@/db/schema";
import type { ApplySummary, DirectoryMember } from "@/lib/planning/types";

export type TeamMember = DirectoryMember & { email: string };

const roleOrder = sql`case ${users.role} when 'admin' then 0 when 'manager' then 1 else 2 end`;

/** Read-only company directory (no password hashes ever leave the database). */
export async function listTeam(): Promise<TeamMember[]> {
  return db
    .select({
      id: users.id,
      code: users.code,
      name: users.name,
      email: users.email,
      role: users.role,
      title: users.title,
      skills: users.skills,
    })
    .from(users)
    .orderBy(roleOrder, asc(users.code));
}

/** What the AI and the correction form may reference: codes, names, roles, skills. */
export async function getDirectory(): Promise<DirectoryMember[]> {
  return db
    .select({
      id: users.id,
      code: users.code,
      name: users.name,
      role: users.role,
      title: users.title,
      skills: users.skills,
    })
    .from(users)
    .orderBy(roleOrder, asc(users.code));
}

export type MeetingImport = {
  id: string;
  title: string | null;
  heldOn: string | null;
  model: string;
  createdAt: Date;
  summary: ApplySummary | null;
};

/** Recent transcript imports (admin only — callers must check the role). */
export async function listRecentImports(limit = 5): Promise<MeetingImport[]> {
  return db
    .select({
      id: meetings.id,
      title: meetings.title,
      heldOn: meetings.heldOn,
      model: meetings.model,
      createdAt: meetings.createdAt,
      summary: meetings.summary,
    })
    .from(meetings)
    .orderBy(desc(meetings.createdAt))
    .limit(limit);
}
