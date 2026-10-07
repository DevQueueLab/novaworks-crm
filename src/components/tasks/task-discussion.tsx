"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useOptimistic,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { addTaskComment, type CommentActionResult } from "@/actions/activity";
import { UserAvatar } from "@/components/people";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityKind, ActivityMeta, UserRole } from "@/db/schema";
import { TASK_STATUS_LABEL } from "@/lib/task-status";
import { cn } from "@/lib/utils";

import { StatusIcon } from "./task-status";

export type ThreadPerson = { id: string; name: string; code: string; role: UserRole };

export type ThreadEntry = {
  id: string;
  kind: ActivityKind;
  body: string | null;
  meta: ActivityMeta | null;
  actor: ThreadPerson;
  /** Formatted on the server (Lahore time); null while a comment is still sending. */
  at: { iso: string; relative: string; absolute: string } | null;
  pending?: boolean;
};

const MAX_LENGTH = 4000;

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", manager: "Manager", agent: "Agent" };

/** Field names logged by `updateTask`, as they read in a sentence. */
const FIELD_LABEL: Record<string, string> = {
  title: "title",
  description: "description",
  assigneeId: "owner",
  dueDate: "deadline",
  estimatedHours: "estimate",
};

/** ["title", "dueDate", "estimatedHours"] → "title, deadline and estimate" */
function joinFields(fields: string[]) {
  const names = fields.map((field) => FIELD_LABEL[field] ?? field);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

type PendingComment = { entry: ThreadEntry; baseline: number };

/** How many saved comments by this person have exactly this text. */
const savedCopies = (entries: ThreadEntry[], authorId: string, body: string) =>
  entries.filter(
    (entry) => !entry.pending && entry.kind === "comment" && entry.actor.id === authorId && entry.body === body,
  ).length;

const noSubscribe = () => () => {};
const isApplePlatform = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const onServer = () => false;

export function TaskDiscussion({
  taskId,
  viewer,
  entries,
}: {
  taskId: string;
  viewer: ThreadPerson;
  entries: ThreadEntry[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [isSending, startSending] = useTransition();
  const [thread, addPending] = useOptimistic(entries, (current: ThreadEntry[], pending: PendingComment) =>
    // A background refresh can deliver the saved comment before the action settles: show it once.
    savedCopies(current, pending.entry.actor.id, pending.entry.body ?? "") > pending.baseline
      ? current
      : [...current, pending.entry],
  );
  const apple = useSyncExternalStore(noSubscribe, isApplePlatform, onServer);

  const commentCount = thread.filter((entry) => entry.kind === "comment").length;
  const canSend = draft.trim().length > 0 && !isSending;

  function send() {
    const body = draft.trim();
    if (!body || isSending) return;

    const entry: ThreadEntry = {
      id: `pending-${Date.now()}`,
      kind: "comment",
      body,
      meta: null,
      actor: viewer,
      at: null,
      pending: true,
    };
    const baseline = savedCopies(entries, viewer.id, body);
    setDraft("");

    startSending(async () => {
      addPending({ entry, baseline });
      let result: CommentActionResult;
      try {
        result = await addTaskComment(taskId, body);
      } catch {
        result = { ok: false, message: "Could not reach the server. Please try again." };
      }
      startSending(() => {
        if (result.ok) {
          router.refresh();
        } else {
          toast.error(result.message);
          // Hand the text back unless a new draft was started meanwhile.
          setDraft((current) => (current.trim() ? current : body));
        }
      });
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  return (
    <section aria-labelledby="task-discussion-heading" className="space-y-5">
      <div className="flex items-baseline gap-2 border-b pb-3">
        <h2 id="task-discussion-heading" className="text-base leading-7 font-semibold tracking-tight">
          Discussion
        </h2>
        {commentCount > 0 && (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">{commentCount}</span>
        )}
      </div>

      {thread.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          No comments yet. Questions and updates posted here are visible to everyone working on this task.
        </p>
      ) : (
        <ol aria-label="Comments and changes" className="space-y-3">
          {thread.map((entry) => (
            <li key={entry.id}>
              {entry.kind === "comment" ? <CommentCard entry={entry} /> : <SystemEvent entry={entry} />}
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={onSubmit} className="flex gap-3">
        <UserAvatar name={viewer.name} code={viewer.code} className="mt-0.5" />
        <div className="min-w-0 flex-1 space-y-2">
          <Textarea
            value={draft}
            maxLength={MAX_LENGTH}
            placeholder="Write a comment"
            aria-label="Write a comment"
            className="max-h-72"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {draft.length > MAX_LENGTH - 500 ? (
                <span className="tabular-nums">
                  {draft.length.toLocaleString("en")} of {MAX_LENGTH.toLocaleString("en")} characters
                </span>
              ) : (
                <>
                  <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd> <Kbd>Enter</Kbd> to send
                </>
              )}
            </p>
            <Button type="submit" size="sm" disabled={!canSend}>
              {isSending && <Loader2 className="animate-spin" />}
              Comment
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function CommentCard({ entry }: { entry: ThreadEntry }) {
  return (
    <div className={cn("flex gap-3 transition-opacity", entry.pending && "opacity-60")}>
      <UserAvatar name={entry.actor.name} code={entry.actor.code} className="mt-0.5" />
      <article className="min-w-0 flex-1 rounded-lg border bg-card px-3.5 py-2.5 shadow-xs">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{entry.actor.name}</span>
          <span className="text-xs text-muted-foreground">{ROLE_LABEL[entry.actor.role]}</span>
          <Stamp at={entry.at} className="ml-auto" />
        </header>
        <p className="mt-1 text-sm leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">{entry.body}</p>
      </article>
    </div>
  );
}

function SystemEvent({ entry }: { entry: ThreadEntry }) {
  const from = entry.meta?.from;
  const to = entry.meta?.to;
  const fields = entry.meta?.fields ?? [];

  let action: ReactNode;
  if (entry.kind === "status_change") {
    if (from && to) {
      action = (
        <>
          moved this from <Strong>{TASK_STATUS_LABEL[from]}</Strong> to <Strong>{TASK_STATUS_LABEL[to]}</Strong>
        </>
      );
    } else if (to) {
      action = (
        <>
          moved this to <Strong>{TASK_STATUS_LABEL[to]}</Strong>
        </>
      );
    } else {
      action = "changed the status";
    }
  } else {
    action = fields.length > 0 ? `updated the ${joinFields(fields)}` : "edited this task";
  }

  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-8 shrink-0 items-center justify-center">
        <span className="flex size-6 items-center justify-center rounded-full border bg-background">
          {entry.kind === "status_change" && to ? (
            <StatusIcon status={to} className="size-3" />
          ) : (
            <Pencil className="size-3 text-muted-foreground" aria-hidden />
          )}
        </span>
      </span>
      <p className="min-w-0 flex-1 py-0.5 text-sm leading-5 text-muted-foreground">
        <Strong>{entry.actor.name}</Strong> {action}
        <span aria-hidden="true"> · </span>
        <Stamp at={entry.at} />
      </p>
    </div>
  );
}

function Stamp({ at, className }: { at: ThreadEntry["at"]; className?: string }) {
  if (!at) return <span className={cn("text-xs text-muted-foreground", className)}>Sending…</span>;
  return (
    <time
      dateTime={at.iso}
      title={at.absolute}
      className={cn("text-xs whitespace-nowrap text-muted-foreground tabular-nums", className)}
    >
      {at.relative}
    </time>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1 py-px font-sans text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
