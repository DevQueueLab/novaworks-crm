import { getCurrentUser } from "@/lib/auth/dal";
import { isUuid } from "@/lib/data/access";
import { listMessages } from "@/lib/data/channels";

/**
 * Messages in a channel the user may open, for live polling: `?after=<messageId>`
 * returns only newer ones. Channels outside the user's scope answer 404,
 * indistinguishable from channels that don't exist.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { channelId } = await params;
  const after = new URL(request.url).searchParams.get("after") || undefined;
  if (after !== undefined && !isUuid(after)) {
    return Response.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const messages = await listMessages(user, channelId, { after, limit: after ? 100 : 200 });
  if (!messages) return Response.json({ error: "Channel not found" }, { status: 404 });

  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
