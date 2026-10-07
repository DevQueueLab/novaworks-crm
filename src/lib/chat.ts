import type { ChannelKind, UserRole } from "@/db/schema";

/*
 * Shapes and helpers for team channels that both the server (data layer,
 * actions, route handlers) and the browser (chat UI) use. No server imports.
 */

export const GENERAL_SLUG = "general";
export const MESSAGE_MAX_LENGTH = 4000;
export const CHANNEL_NAME_MAX_LENGTH = 50;
export const CHANNEL_DESCRIPTION_MAX_LENGTH = 240;

/** Mirrors the `channels_slug_format` check constraint. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** The public face of a user in chat: never an email or password hash. */
export type ChatPerson = {
  id: string;
  name: string;
  code: string;
  role: UserRole;
  title: string;
};

export type ChatMessage = {
  /** uuidv7, so ids sort in time order. */
  id: string;
  channelId: string;
  body: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  author: ChatPerson;
};

export type ChannelSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: ChannelKind;
  projectId: string | null;
  messageCount: number;
  /** ISO 8601 timestamp of the newest message, or null for an empty channel. */
  lastMessageAt: string | null;
};

export type ChannelDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: ChannelKind;
  projectId: string | null;
  /** Set for project channels only. */
  project: { id: string; name: string; client: string } | null;
};

/** "Q4 Website Revamp!" → "q4-website-revamp": lowercase letters, digits and single dashes. */
export function slugify(input: string, max = CHANNEL_NAME_MAX_LENGTH): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** Adds `incoming` to `current`, skipping ids already present, kept in time (id) order. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map((message) => message.id));
  const fresh = incoming.filter((message) => !seen.has(message.id));
  if (fresh.length === 0) return current;
  return [...current, ...fresh].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
