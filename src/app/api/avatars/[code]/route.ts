import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userAvatars, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";

// Browsers keep a copy but must revalidate it each time; If-None-Match turns that into a 304.
const CACHE_CONTROL = "private, no-cache";
const CODE_FORMAT = /^[A-Z0-9]{1,32}$/;

const notFound = () => Response.json({ error: "No photo" }, { status: 404 });

/** Opaque validator: changes whenever the photo is replaced, reveals nothing about the user. */
function etagFor(userId: string, updatedAt: Date) {
  const digest = createHash("sha256").update(`${userId}:${updatedAt.getTime()}`).digest("base64url");
  return `"${digest.slice(0, 27)}"`;
}

function matchesEtag(header: string | null, etag: string) {
  if (!header) return false;
  return header.split(",").some((value) => {
    const tag = value.trim();
    return tag === "*" || tag.replace(/^W\//, "") === etag;
  });
}

/**
 * A person's profile photo, by directory code. Signed-in users only; people
 * without a photo answer 404 so the avatar falls back to initials.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const code = (await params).code.toUpperCase();
  if (!CODE_FORMAT.test(code)) return notFound();

  // Revalidation is the common case, so check the validator before loading the bytes.
  const [meta] = await db
    .select({ userId: userAvatars.userId, updatedAt: userAvatars.updatedAt })
    .from(users)
    .innerJoin(userAvatars, eq(userAvatars.userId, users.id))
    .where(eq(users.code, code))
    .limit(1);
  if (!meta) return notFound();

  const currentEtag = etagFor(meta.userId, meta.updatedAt);
  if (matchesEtag(request.headers.get("if-none-match"), currentEtag)) {
    return new Response(null, { status: 304, headers: { ETag: currentEtag, "Cache-Control": CACHE_CONTROL } });
  }

  const [avatar] = await db
    .select({ image: userAvatars.image, mimeType: userAvatars.mimeType, updatedAt: userAvatars.updatedAt })
    .from(userAvatars)
    .where(eq(userAvatars.userId, meta.userId))
    .limit(1);
  if (!avatar) return notFound();

  return new Response(new Uint8Array(avatar.image), {
    headers: {
      "Content-Type": avatar.mimeType,
      "Content-Length": String(avatar.image.byteLength),
      "Cache-Control": CACHE_CONTROL,
      ETag: etagFor(meta.userId, avatar.updatedAt),
    },
  });
}
