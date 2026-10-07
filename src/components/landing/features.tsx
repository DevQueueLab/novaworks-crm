import { ArrowRight, CalendarDays, Hash, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { BOARD, ROLE_VIEWS, TEAM_ROWS } from "@/components/landing/content";
import {
  Initials,
  container,
  sectionLead,
  sectionTitle,
  tintedSurface,
} from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-16 border-t">
      <div className={cn(container, "py-24 sm:py-32")}>
        <h2 id="features-title" className={sectionTitle}>
          One place for the plan and the work.
        </h2>
        <p className={sectionLead}>
          Each person sees their part, every change stays visible, and every task has its own thread.
        </p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border sm:mt-16 lg:grid-cols-12">
          <Cell
            className="lg:col-span-7"
            title="Views follow the role"
            body="Admins see everything. Managers see their projects. Developers see only their own tasks, filtered inside the database query."
          >
            <RolesVisual />
          </Cell>
          <Cell
            className={cn("lg:col-span-5", tintedSurface)}
            title="Fix it before it saves"
            body="If an owner or a date can’t be resolved, nothing is saved. The admin corrects the field in a form, then the whole plan saves at once."
          >
            <ReviewVisual />
          </Cell>
          <Cell
            className={cn("lg:col-span-5", tintedSurface)}
            title="Re-imports show the difference"
            body="Paste a revised transcript and only what changed is updated, with the old and new values side by side."
          >
            <DiffVisual />
          </Cell>
          <Cell
            className="lg:col-span-7"
            title="A board for the work"
            body="Drag tasks through To do, In progress, In review and Done. Everyone works from the same board, scoped to what they can see."
          >
            <BoardVisual />
          </Cell>
          <Cell
            className="lg:col-span-5"
            title="Threads and channels"
            body="Each task has its own discussion thread, and teams talk in shared channels."
          >
            <ThreadVisual />
          </Cell>
          <Cell
            className={cn("lg:col-span-7", tintedSurface)}
            title="Admin controls"
            body="Add people, set roles, reset passwords and deactivate accounts. Profile photos appear wherever a name does."
          >
            <AdminVisual />
          </Cell>
        </div>
      </div>
    </section>
  );
}

function Cell({
  title,
  body,
  className,
  children,
}: {
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={cn("flex flex-col gap-8 bg-background p-6 sm:p-8", className)}>
      <div>
        <h3 className="text-base font-semibold tracking-tight sm:text-[17px]">{title}</h3>
        <p className="mt-2 max-w-[50ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
          {body}
        </p>
      </div>
      <div className="mt-auto">{children}</div>
    </article>
  );
}

/** A small framed piece of product UI inside a cell. One level deep, never nested. */
const screen = "rounded-lg border bg-card shadow-[0_1px_2px_oklch(0.2_0.03_285/0.04)]";

function RolesVisual() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ROLE_VIEWS.map((view) => (
        <div key={view.role} className={cn(screen, "p-3.5")}>
          <p className="text-[13px] font-medium">{view.role}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {view.role !== "Admin" && <Initials name={view.who} className="size-4 text-[8px]" />}
            {view.who}
          </p>
          <ul className="mt-3 divide-y border-t">
            {view.rows.map((row) => (
              <li
                key={row.label}
                className="flex items-baseline justify-between gap-3 py-2 text-xs leading-snug"
              >
                <span className="min-w-0 text-pretty">{row.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{row.meta}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ReviewVisual() {
  return (
    <div className={cn(screen, "p-4")}>
      <p className="text-xs text-muted-foreground">Demo cart UI</p>
      <p className="mt-3 text-[13px] font-medium">Deadline</p>
      <div className="mt-1.5 flex h-9 items-center justify-between rounded-md border border-destructive/60 bg-background px-3 text-[13px] text-muted-foreground ring-[3px] ring-destructive/10">
        <span>Pick a date</span>
        <CalendarDays aria-hidden className="size-4" />
      </div>
      <p className="mt-2 text-xs text-destructive">Task deadline must be a valid date.</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
        <p className="text-xs text-muted-foreground">Nothing has been saved yet.</p>
        <span className="inline-flex h-7 shrink-0 items-center rounded-md bg-foreground px-2.5 text-xs font-medium text-background">
          Save plan
        </span>
      </div>
    </div>
  );
}

function DiffVisual() {
  return (
    <div className={screen}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-4 py-2.5 text-xs">
        <span className="font-medium">Revised transcript</span>
        <span className="text-muted-foreground tabular-nums">Updated 1 task · 11 unchanged</span>
      </div>
      <div className="px-4 py-4">
        <p className="text-[13px] font-medium">Mobile integration and testing</p>
        <dl className="mt-3 grid grid-cols-[5rem_minmax(0,1fr)] gap-y-2 text-[13px] tabular-nums">
          <dt className="text-muted-foreground">Estimate</dt>
          <dd className="flex items-center gap-2">
            <s className="text-muted-foreground">10h</s>
            <ArrowRight aria-hidden className="size-3.5 text-muted-foreground" />
            <span className="sr-only">changed to</span>
            <span className="font-medium">12h</span>
          </dd>
          <dt className="text-muted-foreground">Deadline</dt>
          <dd className="flex items-center gap-2">
            <s className="text-muted-foreground">22 Oct</s>
            <ArrowRight aria-hidden className="size-3.5 text-muted-foreground" />
            <span className="sr-only">changed to</span>
            <span className="font-medium">23 Oct</span>
          </dd>
        </dl>
      </div>
    </div>
  );
}

function BoardVisual() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {BOARD.map((column) => (
        <div key={column.status} className="rounded-lg bg-muted/60 p-2">
          <p className="flex items-center justify-between px-1 pt-0.5 pb-2 text-xs font-medium">
            {column.status}
            <span className="text-muted-foreground tabular-nums">1</span>
          </p>
          <div className={cn(screen, "p-2.5")}>
            <p className="text-xs leading-snug font-medium text-pretty">{column.card.title}</p>
            <p className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground tabular-nums">
              <Initials name={column.card.owner} className="size-4 text-[8px]" />
              {column.card.due}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadVisual() {
  return (
    <div className={cn(screen, "p-4")}>
      <p className="text-xs text-muted-foreground">Booking and account APIs</p>
      <ul className="mt-3 space-y-3">
        <Message name="Usman Tariq" text="I need those responses for mobile integration." />
        <Message name="Bilal Ahmed" text="Good. This is still one API task under QuickServe." />
      </ul>
      <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-3">
        {["urbancart-website", "quickserve-mobile-app", "helpdeskpro-ai-assistant"].map((channel) => (
          <span
            key={channel}
            className="inline-flex h-6 items-center gap-1 rounded-md border bg-background px-2 text-[11px] text-muted-foreground"
          >
            <Hash aria-hidden className="size-3" />
            {channel}
          </span>
        ))}
      </div>
    </div>
  );
}

function Message({ name, text }: { name: string; text: string }) {
  return (
    <li className="flex gap-2.5">
      <Initials name={name} className="mt-0.5 size-6 text-[9px]" />
      <div className="min-w-0">
        <p className="text-xs font-medium">{name}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground text-pretty">{text}</p>
      </div>
    </li>
  );
}

function AdminVisual() {
  return (
    <div className={cn(screen, "overflow-hidden")}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <p className="text-[13px] font-medium">Users</p>
        <span className="inline-flex h-7 items-center gap-1 rounded-md bg-foreground px-2.5 text-xs font-medium text-background">
          <Plus aria-hidden className="size-3.5" />
          Add user
        </span>
      </div>
      <ul className="divide-y">
        {TEAM_ROWS.map((person) => (
          <li
            key={person.code}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Initials name={person.name} className="size-7 text-[10px]" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.code} · {person.title}
                </p>
              </div>
            </div>
            <span className="justify-self-end rounded-md border px-1.5 text-[11px] leading-5 text-muted-foreground sm:justify-self-start">
              {person.role}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">Active</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
