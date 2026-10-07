"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { channels } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  CHANNEL_DESCRIPTION_MAX_LENGTH,
  CHANNEL_NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  SLUG_PATTERN,
  slugify,
  type ChatMessage,
} from "@/lib/chat";
import { postMessage } from "@/lib/data/channels";

export type SendMessageResult = { ok: true; posted: ChatMessage } | { ok: false; message: string };
export type CreateChannelResult = { ok: true; slug: string } | { ok: false; message: string };

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

const messageInput = z.object({
  channelId: z.uuid("This channel no longer exists."),
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(MESSAGE_MAX_LENGTH, "Messages can be up to 4,000 characters."),
});

/** Posts to a channel the user can open. Access is re-checked in SQL, never taken from the client. */
export async function sendMessage(channelId: string, body: string): Promise<SendMessageResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  // Postgres text cannot hold NUL characters.
  const parsed = messageInput.safeParse({
    channelId,
    body: typeof body === "string" ? body.replaceAll("\u0000", "") : body,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Message not sent." };

  try {
    const posted = await postMessage(user, parsed.data.channelId, parsed.data.body);
    if (!posted) return { ok: false, message: "You can't post in this channel." };
    return { ok: true, posted };
  } catch (error) {
    console.error("sendMessage failed", error);
    return { ok: false, message: "Message not sent. Try again in a moment." };
  }
}

const channelInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the channel a name.")
    .max(CHANNEL_NAME_MAX_LENGTH, `Keep the name to ${CHANNEL_NAME_MAX_LENGTH} characters or fewer.`),
  description: z
    .string()
    .trim()
    .max(
      CHANNEL_DESCRIPTION_MAX_LENGTH,
      `Keep the description to ${CHANNEL_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    )
    .default(""),
});

export type CreateChannelInput = z.input<typeof channelInput>;

/** Any signed-in user can open a custom channel; its slug doubles as its name. */
export async function createChannel(input: CreateChannelInput): Promise<CreateChannelResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = channelInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the channel details." };
  }

  const slug = slugify(parsed.data.name);
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, message: "Use at least one letter or number in the name." };
  }

  try {
    const [created] = await db
      .insert(channels)
      .values({
        slug,
        name: slug,
        description: parsed.data.description,
        kind: "custom",
        createdById: user.id,
      })
      .onConflictDoNothing()
      .returning({ slug: channels.slug });

    if (!created) return { ok: false, message: `#${slug} already exists. Try another name.` };

    revalidatePath("/messages", "layout");
    return { ok: true, slug: created.slug };
  } catch (error) {
    console.error("createChannel failed", error);
    return { ok: false, message: "The channel could not be created. Try again in a moment." };
  }
}
