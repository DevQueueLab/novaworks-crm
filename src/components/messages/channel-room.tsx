"use client";

import { ArrowDown, FolderKanban, Hash, MessagesSquare, PanelLeft, Send } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import { sendMessage } from "@/actions/channels";
import { AvatarStack, RoleBadge, UserAvatar } from "@/components/people";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  MESSAGE_MAX_LENGTH,
  mergeMessages,
  type ChannelDetail,
  type ChannelSummary,
  type ChatMessage,
  type ChatPerson,
} from "@/lib/chat";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ChannelList } from "./channel-list";
import { dayLabel, dayOf, formatClock, formatFullTimestamp, formatTime } from "./time";

const POLL_INTERVAL_MS = 3000;
/** Consecutive messages by one author within this window share a header. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;
/** Within this distance of the bottom, new messages keep the view pinned to the latest. */
const NEAR_BOTTOM_PX = 96;

type Row = { message: ChatMessage; continued: boolean; pending: boolean };
type Day = { day: string; rows: Row[] };

export function ChannelRoom({
  channel,
  channels,
  members,
  initialMessages,
  viewer,
}: {
  channel: ChannelDetail;
  channels: ChannelSummary[];
  members: ChatPerson[];
  initialMessages: ChatMessage[];
  viewer: ChatPerson;
}) {
  const [messages, setMessages] = useState(initialMessages);
  /** The message being sent, shown optimistically until the server confirms it. */
  const [pending, setPending] = useState<ChatMessage | null>(null);
  const [draft, setDraft] = useState("");
  const [hasUnseen, setHasUnseen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const pinnedRef = useRef(true);
  /** True while a send is in flight, so a poll can't race the optimistic copy. */
  const sendingRef = useRef(false);

  const lastId = messages.at(-1)?.id;
  const shown = pending ? [...messages, pending] : messages;
  const days = groupByDay(shown, pending?.id ?? null);
  const today = todayIso();
  const remaining = MESSAGE_MAX_LENGTH - draft.length;

  // Live updates: ask for anything newer than the last message every few
  // seconds while the tab is visible, and right away when it becomes visible.
  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    async function poll() {
      if (stopped || inFlight) return;
      if (document.visibilityState === "visible" && !sendingRef.current) {
        inFlight = true;
        try {
          const query = lastId ? `?after=${encodeURIComponent(lastId)}` : "";
          const response = await fetch(`/api/channels/${channel.id}/messages${query}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          // Signed out or lost access: stop asking.
          if (response.status === 401 || response.status === 404) {
            stopped = true;
            return;
          }
          if (response.ok) {
            const data = (await response.json()) as { messages: ChatMessage[] };
            if (!stopped && data.messages.length > 0) {
              setMessages((current) => mergeMessages(current, data.messages));
              if (!pinnedRef.current) setHasUnseen(true);
            }
          }
        } catch {
          // Offline or aborted: the next tick tries again.
        } finally {
          inFlight = false;
        }
      }
      if (!stopped) timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !inFlight && !stopped) {
        clearTimeout(timer);
        void poll();
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [channel.id, lastId]);

  // Stay on the latest message when something arrives, unless the reader scrolled up.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && pinnedRef.current) scroller.scrollTop = scroller.scrollHeight;
  }, [shown.length]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= NEAR_BOTTOM_PX;
    pinnedRef.current = nearBottom;
    if (nearBottom && hasUnseen) setHasUnseen(false);
  }

  function jumpToLatest() {
    const scroller = scrollerRef.current;
    pinnedRef.current = true;
    setHasUnseen(false);
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  async function send() {
    const body = draft.trim();
    if (!body || pending) return;
    if (body.length > MESSAGE_MAX_LENGTH) {
      toast.error("Messages can be up to 4,000 characters.");
      return;
    }

    sendingRef.current = true;
    pinnedRef.current = true;
    setHasUnseen(false);
    setPending({
      id: `pending-${Date.now()}`,
      channelId: channel.id,
      body,
      createdAt: new Date().toISOString(),
      author: viewer,
    });
    setDraft("");

    const result = await sendMessage(channel.id, body).catch(() => null);
    if (result && result.ok) {
      const posted = result.posted;
      setMessages((current) => mergeMessages(current, [posted]));
    } else {
      // Give the text back so nothing is lost, unless a new draft was started.
      setDraft((current) => (current.trim() ? current : body));
      toast.error(
        result && !result.ok ? result.message : "Message not sent. Check your connection and try again.",
      );
    }
    setPending(null);
    sendingRef.current = false;
    composerRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a line, and IME composition is left alone.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  const ChannelIcon = channel.kind === "project" ? FolderKanban : Hash;

  return (
    <section aria-label={`#${channel.name}`} className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Sheet open={switcherOpen} onOpenChange={setSwitcherOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="-ml-1 md:hidden" aria-label="Switch channel">
              <PanelLeft />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 p-0 sm:max-w-72">
            <SheetTitle className="sr-only">Channels</SheetTitle>
            <SheetDescription className="sr-only">Switch to another channel or start a new one.</SheetDescription>
            <ChannelList
              channels={channels}
              activeSlug={channel.slug}
              onNavigate={() => setSwitcherOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-1.5 text-[15px] leading-5 font-semibold">
            <ChannelIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{channel.name}</span>
          </h1>
          {channel.description && (
            <p className="truncate text-xs leading-5 text-muted-foreground" title={channel.description}>
              {channel.description}
            </p>
          )}
        </div>

        {channel.project && (
          <Button asChild variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
            <Link href={`/projects/${channel.project.id}`} title={`Open ${channel.project.name}`}>
              <FolderKanban aria-hidden />
              <span className="sr-only sm:not-sr-only">Open project</span>
            </Link>
          </Button>
        )}

        <MembersMenu members={members} />
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={scrollerRef} onScroll={handleScroll} className="h-full overflow-y-auto overscroll-contain">
          {shown.length === 0 ? (
            <EmptyChannel />
          ) : (
            <div className="flex min-h-full flex-col justify-end pb-3">
              <div role="log" aria-label={`Messages in #${channel.name}`}>
                {days.map((day) => (
                  <DaySection key={day.day} day={day} today={today} />
                ))}
              </div>
            </div>
          )}
        </div>

        {hasUnseen && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium shadow-md transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowDown className="size-3.5" aria-hidden />
            New messages
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t px-3 py-3 sm:px-4">
        <div className="rounded-lg border bg-background shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
          <label htmlFor="channel-composer" className="sr-only">
            Message #{channel.name}
          </label>
          <Textarea
            ref={composerRef}
            id="channel-composer"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={1}
            aria-describedby="channel-composer-hint"
            className="max-h-48 min-h-11 resize-none rounded-lg border-0 bg-transparent px-3 py-2.5 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-2">
            <p id="channel-composer-hint" className="min-w-0 truncate pl-1 text-xs text-muted-foreground">
              {remaining < 500 ? (
                <span className={cn("tabular-nums", remaining < 100 && "text-destructive")}>
                  {remaining.toLocaleString("en-US")} characters left
                </span>
              ) : (
                <span className="hidden sm:inline">Enter to send, Shift + Enter for a new line</span>
              )}
            </p>
            <Button type="submit" size="sm" disabled={!draft.trim() || pending !== null}>
              <Send aria-hidden />
              Send
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

/** Splits messages into calendar days and marks follow-ups from the same author. */
function groupByDay(messages: ChatMessage[], pendingId: string | null): Day[] {
  const days: Day[] = [];
  let previous: ChatMessage | undefined;

  for (const message of messages) {
    const day = dayOf(message.createdAt);
    let bucket = days.at(-1);
    if (!bucket || bucket.day !== day) {
      bucket = { day, rows: [] };
      days.push(bucket);
      previous = undefined;
    }
    const continued =
      previous !== undefined &&
      previous.author.id === message.author.id &&
      Date.parse(message.createdAt) - Date.parse(previous.createdAt) < GROUP_WINDOW_MS;
    bucket.rows.push({ message, continued, pending: message.id === pendingId });
    previous = message;
  }
  return days;
}

function DaySection({ day, today }: { day: Day; today: string }) {
  const label = dayLabel(day.day, today);
  return (
    <section
      aria-label={label}
      className="relative before:absolute before:inset-x-4 before:top-[19px] before:h-px before:bg-border sm:before:inset-x-5"
    >
      <div className="sticky top-0 z-10 flex justify-center py-2">
        <span
          suppressHydrationWarning
          className="rounded-full border bg-card px-3 text-xs leading-5 font-medium text-muted-foreground shadow-xs"
        >
          {label}
        </span>
      </div>
      <ol>
        {day.rows.map((row) => (
          <MessageRow key={row.message.id} row={row} />
        ))}
      </ol>
    </section>
  );
}

function MessageRow({ row }: { row: Row }) {
  const { message, continued, pending } = row;
  const fullTimestamp = formatFullTimestamp(message.createdAt);

  return (
    <li
      aria-busy={pending || undefined}
      className={cn(
        "group flex gap-3 px-4 transition-colors hover:bg-muted/40 sm:px-5",
        continued ? "py-0.5" : "mt-1 pt-1.5 pb-0.5",
        pending && "opacity-60",
      )}
    >
      <div className="w-8 shrink-0">
        {continued ? (
          <time
            dateTime={message.createdAt}
            title={fullTimestamp}
            suppressHydrationWarning
            className="block text-center text-[10px] leading-6 text-muted-foreground tabular-nums opacity-0 transition-opacity group-hover:opacity-100"
          >
            {formatClock(message.createdAt)}
          </time>
        ) : (
          <UserAvatar name={message.author.name} code={message.author.code} className="mt-0.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!continued && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm leading-6 font-semibold">{message.author.name}</span>
            <RoleBadge role={message.author.role} className="px-1.5 py-0 text-[10px]" />
            {pending ? (
              <span className="text-xs text-muted-foreground">Sending…</span>
            ) : (
              <time
                dateTime={message.createdAt}
                title={fullTimestamp}
                suppressHydrationWarning
                className="text-xs text-muted-foreground tabular-nums"
              >
                {formatTime(message.createdAt)}
              </time>
            )}
          </div>
        )}
        <p className="text-sm leading-6 break-words whitespace-pre-wrap">{message.body}</p>
      </div>
    </li>
  );
}

function MembersMenu({ members }: { members: ChatPerson[] }) {
  if (members.length === 0) return null;
  const label = `${members.length} ${members.length === 1 ? "member" : "members"}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-2 px-1.5" aria-label={`Show ${label}`}>
          <AvatarStack people={members} max={3} />
          <span className="text-xs text-muted-foreground tabular-nums">{members.length}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-72">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((person) => (
          <DropdownMenuItem key={person.id} className="gap-2.5">
            <UserAvatar name={person.name} code={person.code} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{person.name}</div>
              {person.title && <div className="truncate text-xs text-muted-foreground">{person.title}</div>}
            </div>
            <RoleBadge role={person.role} className="px-1.5 py-0 text-[10px]" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyChannel() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs">
        <MessagesSquare className="size-5" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
    </div>
  );
}
