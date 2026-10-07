import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userAvatars } from "@/db/schema";

/** Matches the `user_avatars_byte_size` check (512 KB). Browsers upload 256px images well under this. */
export const MAX_AVATAR_BYTES = 512 * 1024;

export type AvatarMimeType = "image/webp" | "image/jpeg" | "image/png";

export type AvatarResult = { ok: true } | { ok: false; message: string };

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((byte, i) => bytes[offset + i] === byte);

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG = [0xff, 0xd8, 0xff] as const;
const RIFF = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
const WEBP = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP"

/**
 * The image type from the file's magic bytes, or null when it is not a PNG,
 * JPEG or WebP. The browser-reported type is never trusted.
 */
export function detectImageType(bytes: Uint8Array): AvatarMimeType | null {
  if (startsWith(bytes, PNG)) return "image/png";
  if (startsWith(bytes, JPEG)) return "image/jpeg";
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return "image/webp";
  return null;
}

/** Validates and stores (or replaces) a user's photo under its detected type. */
export async function saveAvatar(userId: string, file: Blob): Promise<AvatarResult> {
  if (file.size === 0) return { ok: false, message: "That file is empty. Choose an image to upload." };
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, message: "Photos can be at most 512 KB. Try a smaller image." };
  }

  const image = Buffer.from(await file.arrayBuffer());
  if (image.byteLength === 0 || image.byteLength > MAX_AVATAR_BYTES) {
    return { ok: false, message: "Photos can be at most 512 KB. Try a smaller image." };
  }

  const mimeType = detectImageType(image);
  if (!mimeType) return { ok: false, message: "Upload a PNG, JPEG or WebP image." };

  const values = { image, mimeType, byteSize: image.byteLength, updatedAt: new Date() };
  await db
    .insert(userAvatars)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userAvatars.userId, set: values });

  return { ok: true };
}

/** Deletes a user's photo; a no-op when they have none. */
export async function removeAvatar(userId: string): Promise<void> {
  await db.delete(userAvatars).where(eq(userAvatars.userId, userId));
}
