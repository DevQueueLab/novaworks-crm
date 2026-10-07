import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ChannelList } from "@/components/messages/channel-list";
import { ChannelRoom } from "@/components/messages/channel-room";
import { requireUser } from "@/lib/auth/dal";
import { channelMembers, getChannel, listChannels, listMessages } from "@/lib/data/channels";

type Props = { params: Promise<{ slug: string }> };

/** One user + channel lookup per request, shared by the metadata and the page. */
const loadChannel = cache(async (slug: string) => {
  const user = await requireUser();
  // Listing first also creates #general and any missing project channels.
  const channels = await listChannels(user);
  const channel = await getChannel(user, slug);
  return { user, channels, channel };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { channel } = await loadChannel(slug);
  return { title: channel ? `#${channel.name}` : "Channel not found" };
}

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;
  const { user, channels, channel } = await loadChannel(slug);
  if (!channel) notFound();

  const [messages, members] = await Promise.all([
    listMessages(user, channel.id, { limit: 200 }),
    channelMembers(user, channel),
  ]);

  return (
    // Fills the viewport below the mobile header (3.5rem) and inside main's vertical padding.
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[26rem] overflow-hidden rounded-xl border bg-card shadow-xs lg:h-[calc(100dvh-5rem)]">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex lg:w-64">
        <ChannelList channels={channels} activeSlug={channel.slug} />
      </aside>
      <ChannelRoom
        key={channel.id}
        channel={channel}
        channels={channels}
        members={members}
        initialMessages={messages ?? []}
        viewer={{ id: user.id, name: user.name, code: user.code, role: user.role, title: user.title }}
      />
    </div>
  );
}
