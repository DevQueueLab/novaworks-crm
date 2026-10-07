import { Check, CircleCheck, FileText, ListChecks } from "lucide-react";
import type { ReactNode } from "react";

import { LEFT_OUT, PROJECTS } from "@/components/landing/content";
import { HowItWorksMotion } from "@/components/landing/how-it-works-motion";
import { Initials, container, sectionLead, sectionTitle } from "@/components/landing/primitives";
import { SAMPLE_TRANSCRIPT } from "@/lib/samples";
import { cn } from "@/lib/utils";

/* Facts about the bundled transcript, computed rather than typed in. */
const EXCERPT = SAMPLE_TRANSCRIPT.split("\n").slice(0, 12).join("\n");
const WORDS = SAMPLE_TRANSCRIPT.split(/\s+/).filter(Boolean).length;
const PARTICIPANTS = (/^Participants: (.+)$/m.exec(SAMPLE_TRANSCRIPT)?.[1] ?? "")
  .split(",")
  .filter((name) => name.trim()).length;
const TASK_COUNT = PROJECTS.reduce((sum, project) => sum + project.tasks, 0);

const STEPS = [
  {
    title: "Paste the transcript",
    body: "Drop the raw meeting text into Create from transcript. Speaker names and timestamps can stay exactly as they are.",
  },
  {
    title: "AI applies the final decisions",
    body: "Later corrections replace earlier ones and the closing recap settles the rest. Rejected scope and people outside the team stay out.",
  },
  {
    title: "Validated plan saved",
    body: "Owners, roles and dates are checked against your real directory. Then the whole plan saves in one transaction.",
  },
] as const;

const CHECKS = [
  "Every owner is in the team directory",
  "Managers own projects, developers own tasks",
  "No task is due after its project",
  "Saved together, or not at all",
] as const;

export function HowItWorks() {
  const panels = [<PastePanel key="paste" />, <DecidePanel key="decide" />, <SavePanel key="save" />];

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-16 border-t">
      <HowItWorksMotion>
        <div
          data-how-pin
          className={cn(
            container,
            "py-24 sm:py-32 lg:flex lg:min-h-dvh lg:flex-col lg:justify-center lg:py-16",
          )}
        >
          <h2 id="how-title" className={sectionTitle}>
            From meeting to plan
          </h2>
          <p className={sectionLead}>
            Nothing reaches your projects until every owner, date and estimate checks out.
          </p>

          <div className="mt-12 grid gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-x-12">
            <ol data-how-rail className="hidden flex-col justify-center gap-9 lg:col-span-4">
              {STEPS.map((step) => (
                <li key={step.title} data-rail-item>
                  <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground text-pretty">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>

            <div data-how-steps className="grid gap-16 lg:col-span-12 lg:gap-20">
              {STEPS.map((step, i) => (
                <article
                  key={step.title}
                  data-how-step
                  className="grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-x-12"
                >
                  <div data-how-caption className="lg:col-span-4">
                    <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
                      {step.body}
                    </p>
                  </div>
                  {panels[i]}
                </article>
              ))}
            </div>
          </div>
        </div>
      </HowItWorksMotion>
    </section>
  );
}

function Panel({
  icon,
  label,
  meta,
  children,
}: {
  icon: ReactNode;
  label: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <div
      data-how-panel
      className="flex flex-col rounded-xl border bg-card p-5 shadow-[0_1px_2px_oklch(0.2_0.03_285/0.05),0_24px_48px_-32px_oklch(0.25_0.06_285/0.22)] sm:p-6 lg:col-span-8 dark:shadow-none"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {icon}
          <span className="truncate">{label}</span>
        </p>
        <p className="shrink-0 text-xs text-muted-foreground tabular-nums">{meta}</p>
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function PastePanel() {
  return (
    <Panel
      icon={<FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
      label="Create from transcript"
      meta="Sample transcript"
    >
      <div className="h-56 overflow-hidden rounded-lg border bg-background px-4 py-3 text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
        {EXCERPT}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <p className="text-xs text-muted-foreground tabular-nums">
          {WORDS.toLocaleString("en-US")} words · {PARTICIPANTS} participants
        </p>
        <span className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background">
          Create from transcript
        </span>
      </div>
    </Panel>
  );
}

function DecidePanel() {
  return (
    <Panel
      icon={<ListChecks aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
      label="Final decisions"
      meta="Closing recap, 09:56"
    >
      <blockquote data-stagger className="rounded-lg bg-muted/70 px-4 py-3">
        <p className="text-[13px] leading-relaxed sm:text-sm">
          “Those are the final decisions. Keep the rejected features out.”
        </p>
        <footer className="mt-1.5 text-xs text-muted-foreground">Ayesha Khan, project manager</footer>
      </blockquote>

      <p data-stagger className="mt-5 text-xs font-medium text-muted-foreground">
        Left out of the plan
      </p>
      <ul className="mt-1 divide-y">
        {LEFT_OUT.map((item) => (
          <li
            key={item.what}
            data-stagger
            className="flex items-baseline justify-between gap-4 py-2 text-[13px]"
          >
            <s className="text-muted-foreground decoration-muted-foreground/50">{item.what}</s>
            <span className="shrink-0 text-xs text-muted-foreground">{item.project}</span>
          </li>
        ))}
      </ul>

      <p data-stagger className="mt-auto pt-4 text-xs text-muted-foreground">
        Kept: <span className="font-medium text-foreground">{PROJECTS.length} projects, {TASK_COUNT} tasks</span>.{" "}
        <a
          href="#decisions"
          className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/40"
        >
          See what the meeting corrected
        </a>
      </p>
    </Panel>
  );
}

function SavePanel() {
  return (
    <Panel
      icon={<CircleCheck aria-hidden className="size-4 shrink-0 text-success" />}
      label={`${PROJECTS.length} projects and ${TASK_COUNT} tasks saved`}
      meta="One transaction"
    >
      <ul className="divide-y border-y">
        {PROJECTS.map((project) => (
          <li
            key={project.name}
            data-stagger
            className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-x-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium sm:text-sm">{project.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Initials name={project.manager} className="size-4 text-[8px]" />
                <span className="truncate">{project.manager}</span>
                <span className="hidden shrink-0 sm:inline">· {project.tasks} tasks</span>
              </p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums sm:text-[13px]">
              Due {project.due}
            </span>
            <span className="text-right text-[13px] font-medium tabular-nums sm:text-sm">
              {project.hours}h
            </span>
          </li>
        ))}
      </ul>

      <ul data-stagger className="mt-auto grid gap-x-6 gap-y-2.5 pt-5 text-[13px] sm:grid-cols-2">
        {CHECKS.map((check) => (
          <li key={check} className="flex items-start gap-2">
            <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
            <span className="text-pretty">{check}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
