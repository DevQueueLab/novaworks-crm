import "server-only";

import { and, asc, desc, eq, exists, gt, isNull, ne, notExists, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { channelMessages, channels, clients, projects, tasks, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/dal";
import {
  GENERAL_SLUG,
  SLUG_PATTERN,
  slugify,
  type ChannelDetail,
  type ChannelSummary,
  type ChatMessage,
  type ChatPerson,
} from "@/lib/chat";

import { isUuid, visibleProjects } from "./access";

/*
 * Channel visibility, enforced in SQL like the rest of the data layer:
 *
 *   general + custom → every signed-in user
 *   project          → whoever can see the project (admin, its manager,
 *                      agents with a task in it), via `visibleProjects`
 */

type Viewer = Pick<SessionUser, "id" | "role">;
type Author = Pick<SessionUser, "id" | "role" | "name" | "code" | "title">;

/** Rows of `channels` the viewer may read and post in. `undefined` means no restriction. */
function accessibleChannels(viewer: Viewer): SQL | undefined {
  if (viewer.role === "admin") return undefined;
  return or(
    ne(channels.kind, "project"),
    exists(
      db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, channels.projectId), visibleProjects(viewer))),
    ),
  );
}

const kindOrder = sql`case ${channels.kind} when 'general' then 0 when 'project' then 1 else 2 end`;
const roleOrder = sql`case ${users.role} when 'admin' then 0 when 'manager' then 1 else 2 end`;

const personColumns = {
  id: users.id,
  name: users.name,
  code: users.code,
  role: users.role,
  title: users.title,
};

/**
 * Idempotently creates #general and one channel per project that lacks one.
 * Safe under concurrent requests: unique slug / project_id conflicts are skipped
 * and any project that loses a slug race simply gets its channel on the next call.
 */
export async function ensureDefaultChannels(): Promise<void> {
  const [[general], missing] = await Promise.all([
    db.select({ id: channels.id }).from(channels).where(eq(channels.slug, GENERAL_SLUG)).limit(1),
    db
      .select({ id: projects.id, name: projects.name, client: clients.name })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(
        notExists(db.select({ id: channels.id }).from(channels).where(eq(channels.projectId, projects.id))),
      )
      .orderBy(asc(projects.createdAt)),
  ]);

  if (!general) {
    await db
      .insert(channels)
      .values({
        slug: GENERAL_SLUG,
        name: GENERAL_SLUG,
        description: "Company-wide announcements and chat",
        kind: "general",
      })
      .onConflictDoNothing();
  }

  if (missing.length === 0) return;

  const taken = new Set((await db.select({ slug: channels.slug }).from(channels)).map((row) => row.slug));
  const rows = missing.map((project) => {
    const slug = uniqueSlug(slugify(project.name) || "project", taken);
    taken.add(slug);
    return {
      slug,
      name: slug,
      description: `Discussion for ${project.name} (${project.client})`,
      kind: "project" as const,
      projectId: project.id,
    };
  });

  await db.insert(channels).values(rows).onConflictDoNothing();
}

/** `base`, or `base-2`, `base-3`… whichever is free. `base` is at most 50 chars, so this stays under 63. */
function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Channels the viewer may open: #general, then project channels, then custom ones, each by name. */
export async function listChannels(viewer: Viewer): Promise<ChannelSummary[]> {
  await ensureDefaultChannels();

  const rows = await db
    .select({
      id: channels.id,
      slug: channels.slug,
      name: channels.name,
      description: channels.description,
      kind: channels.kind,
      projectId: channels.projectId,
      messageCount: sql<number>`count(${channelMessages.id})::int`,
      lastMessageAt: sql<Date>`max(${channelMessages.createdAt})`.mapWith(channelMessages.createdAt),
    })
    .from(channels)
    .leftJoin(channelMessages, eq(channelMessages.channelId, channels.id))
    .where(accessibleChannels(viewer))
    .groupBy(channels.id)
    .orderBy(kindOrder, asc(channels.name));

  return rows.map((row) => ({
    ...row,
    lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt).toISOString() : null,
  }));
}

/** One channel by slug, or null when it does not exist OR the viewer may not open it. */
export async function getChannel(viewer: Viewer, slug: string): Promise<ChannelDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return null;

  const [row] = await db
    .select({
      id: channels.id,
      slug: channels.slug,
      name: channels.name,
      description: channels.description,
      kind: channels.kind,
      projectId: channels.projectId,
      projectName: projects.name,
      client: clients.name,
    })
    .from(channels)
    .leftJoin(projects, eq(projects.id, channels.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(eq(channels.slug, slug), accessibleChannels(viewer)))
    .limit(1);

  if (!row) return null;

  const { projectName, client, ...channel } = row;
  return {
    ...channel,
    project:
      channel.projectId && projectName ? { id: channel.projectId, name: projectName, client: client ?? "" } : null,
  };
}

/** Whether the viewer may read and post in the channel (checked in SQL). */
export async function canAccessChannel(viewer: Viewer, channelId: string): Promise<boolean> {
  if (!isUuid(channelId)) return false;
  const [row] = await db
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.id, channelId), accessibleChannels(viewer)))
    .limit(1);
  return Boolean(row);
}

const selectMessages = () =>
  db
    .select({
      id: channelMessages.id,
      channelId: channelMessages.channelId,
      body: channelMessages.body,
      createdAt: channelMessages.createdAt,
      author: personColumns,
    })
    .from(channelMessages)
    .innerJoin(users, eq(users.id, channelMessages.authorId));

type MessageRow = Awaited<ReturnType<typeof selectMessages>>[number];

const toChatMessage = (row: MessageRow): ChatMessage => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});

/**
 * Messages in a channel, oldest first. Without `after`: the newest `limit`.
 * With `after` (a message id): only newer ones, for polling, since uuidv7 ids
 * are time-ordered. Returns null when the channel is missing or off-limits.
 */
export async function listMessages(
  viewer: Viewer,
  channelId: string,
  { after, limit = 200 }: { after?: string; limit?: number } = {},
): Promise<ChatMessage[] | null> {
  if (!isUuid(channelId) || (after !== undefined && !isUuid(after))) return null;
  if (!(await canAccessChannel(viewer, channelId))) return null;

  const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), 500);

  if (after) {
    const rows = await selectMessages()
      .where(and(eq(channelMessages.channelId, channelId), gt(channelMessages.id, after)))
      .orderBy(asc(channelMessages.id))
      .limit(take);
    return rows.map(toChatMessage);
  }

  const rows = await selectMessages()
    .where(eq(channelMessages.channelId, channelId))
    .orderBy(desc(channelMessages.id))
    .limit(take);
  return rows.reverse().map(toChatMessage);
}

/** Posts a message after re-checking access; null when the author may not post here. */
export async function postMessage(author: Author, channelId: string, body: string): Promise<ChatMessage | null> {
  if (!(await canAccessChannel(author, channelId))) return null;

  const [row] = await db
    .insert(channelMessages)
    .values({ channelId, authorId: author.id, body })
    .returning({
      id: channelMessages.id,
      channelId: channelMessages.channelId,
      body: channelMessages.body,
      createdAt: channelMessages.createdAt,
    });
  if (!row) return null;

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    author: { id: author.id, name: author.name, code: author.code, role: author.role, title: author.title },
  };
}

/**
 * Active people who can open the channel: everyone for #general and custom
 * channels; the admin, the project's manager and its task assignees for a
 * project channel. Empty when the viewer cannot open the channel themselves.
 */
export async function channelMembers(
  viewer: Viewer,
  channel: Pick<ChannelDetail, "id" | "kind" | "projectId">,
): Promise<ChatPerson[]> {
  const viewerCanOpen = exists(
    db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.id, channel.id), accessibleChannels(viewer))),
  );

  const projectId = channel.kind === "project" ? channel.projectId : null;
  const onProject = projectId
    ? or(
        eq(users.role, "admin"),
        exists(
          db
            .select({ id: projects.id })
            .from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.managerId, users.id))),
        ),
        exists(
          db
            .select({ id: tasks.id })
            .from(tasks)
            .where(and(eq(tasks.projectId, projectId), eq(tasks.assigneeId, users.id))),
        ),
      )
    : undefined;

  return db
    .select(personColumns)
    .from(users)
    .where(and(isNull(users.deactivatedAt), viewerCanOpen, onProject))
    .orderBy(roleOrder, asc(users.name));
}
