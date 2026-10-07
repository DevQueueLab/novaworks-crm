"use client";

import { FolderKanban, Hash, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import type { ChannelSummary } from "@/lib/chat";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

import { NewChannelSheet } from "./new-channel-sheet";
import { activityLabel } from "./time";

/**
 * The channel switcher: #general and custom channels, then project channels.
 * Rendered in the left pane on desktop and inside a sheet on small screens,
 * where `onNavigate` closes the sheet.
 */
export function ChannelList({
  channels,
  activeSlug,
  onNavigate,
}: {
  channels: ChannelSummary[];
  activeSlug: string;
  onNavigate?: () => void;
}) {
  const id = useId();
  const today = todayIso();
  const open = channels.filter((channel) => channel.kind !== "project");
  const projectChannels = channels.filter((channel) => channel.kind === "project");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <h2 className="text-sm font-semibold">Messages</h2>
      </div>

      <nav aria-label="Channels" className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
        <section aria-labelledby={`${id}-channels`} className="space-y-0.5">
          <h3 id={`${id}-channels`} className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            Channels
          </h3>
          {open.map((channel) => (
            <ChannelLink
              key={channel.id}
              channel={channel}
              icon={Hash}
              active={channel.slug === activeSlug}
              today={today}
              onNavigate={onNavigate}
            />
          ))}
          <NewChannelSheet onCreated={onNavigate} />
        </section>

        <section aria-labelledby={`${id}-projects`} className="space-y-0.5">
          <h3 id={`${id}-projects`} className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            Projects
          </h3>
          {projectChannels.length === 0 ? (
            <p className="px-2 py-1 text-xs leading-5 text-muted-foreground">
              Project channels appear here once you are on a project.
            </p>
          ) : (
            projectChannels.map((channel) => (
              <ChannelLink
                key={channel.id}
                channel={channel}
                icon={FolderKanban}
                active={channel.slug === activeSlug}
                today={today}
                onNavigate={onNavigate}
              />
            ))
          )}
        </section>
      </nav>
    </div>
  );
}

function ChannelLink({
  channel,
  icon: Icon,
  active,
  today,
  onNavigate,
}: {
  channel: ChannelSummary;
  icon: LucideIcon;
  active: boolean;
  today: string;
  onNavigate?: () => void;
}) {
  const count = `${channel.messageCount} ${channel.messageCount === 1 ? "message" : "messages"}`;
  return (
    <Link
      href={`/messages/${channel.slug}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={channel.description ? `${channel.description} · ${count}` : count}
      className={cn(
        "group flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{channel.name}</span>
      {channel.lastMessageAt && (
        <time
          dateTime={channel.lastMessageAt}
          suppressHydrationWarning
          className="shrink-0 text-[11px] font-normal text-muted-foreground/80 tabular-nums"
        >
          {activityLabel(channel.lastMessageAt, today)}
        </time>
      )}
    </Link>
  );
}
