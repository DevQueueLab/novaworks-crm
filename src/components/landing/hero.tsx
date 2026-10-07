"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ArrowRight, FileText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import {
  HERO_LINES,
  URBANCART,
  URBANCART_EARLIER_TASK_DUE,
  URBANCART_TASKS,
} from "@/components/landing/content";
import {
  Initials,
  container,
  highlightStyle,
  pick,
  primaryCta,
  secondaryCta,
  strikeStyle,
} from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, SplitText);

const TOTAL_HOURS = URBANCART_TASKS.reduce((sum, task) => sum + task.hours, 0);

/** Seconds between transcript lines while the demo "reads". */
const STEP = 0.5;

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const reading = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Reduced motion: nothing runs, the markup already shows the finished plan.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scope = root.current;
        if (!scope) return;

        const intro = pick(scope, "[data-intro]");
        // If hydration was slow, the CSS failsafe has already revealed the copy.
        const late = intro.some((el) => Number.parseFloat(getComputedStyle(el).opacity) > 0.5);
        gsap.set(intro, { animation: "none", autoAlpha: 1 });

        let split: SplitText | null = null;
        if (!late) {
          const title = scope.querySelector<HTMLElement>("[data-hero-title]");
          if (title) {
            // Lines rise out of a mask; autoSplit re-splits on resize and font load.
            split = new SplitText(title, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit: (self: SplitText) =>
                gsap.from(self.lines, {
                  yPercent: 108,
                  duration: 1.15,
                  ease: "expo.out",
                  stagger: 0.09,
                  delay: 0.05,
                }),
            });
          }
          gsap.from(pick(scope, "[data-hero-fade]"), {
            autoAlpha: 0,
            y: 14,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.08,
            delay: 0.3,
          });
          gsap.from(pick(scope, "[data-hero-demo]"), {
            autoAlpha: 0,
            y: 28,
            duration: 1.1,
            ease: "expo.out",
            delay: 0.5,
          });
        }

        reading.current = buildReading(scope);
        return () => {
          split?.revert();
          reading.current = null;
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="hero-title" className="overflow-x-clip">
      <div className={cn(container, "pt-14 pb-20 sm:pt-20 sm:pb-28 lg:pt-24")}>
        <h1
          id="hero-title"
          data-hero-title
          data-intro
          className="max-w-[20ch] text-[clamp(2.6rem,6.2vw,4.9rem)] leading-[1.04] font-semibold tracking-[-0.038em] text-balance"
        >
          Your meeting already made the plan.
        </h1>
        <p
          data-hero-fade
          data-intro
          className="mt-6 max-w-[44ch] text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl"
        >
          Paste a transcript. NovaWorks reads the final decisions and builds projects and tasks with
          owners, deadlines and hours.
        </p>
        <div data-hero-fade data-intro className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/login" className={primaryCta}>
            Sign in
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
          <a href="#how" className={secondaryCta}>
            See how it works
          </a>
        </div>

        <figure
          data-hero-demo
          data-intro
          className="mt-14 overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_oklch(0.2_0.03_285/0.05),0_32px_64px_-36px_oklch(0.25_0.06_285/0.3)] sm:mt-16 dark:shadow-none"
        >
          <figcaption className="sr-only">
            An excerpt from the bundled planning transcript, and the UrbanCart Website plan NovaWorks
            builds from it. Later corrections replace earlier dates and rejected scope is left out.
          </figcaption>

          <div className="flex h-12 items-center justify-between gap-3 border-b px-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 text-[13px]">
              <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">NovaWorks Client Delivery Planning</span>
              <span className="hidden shrink-0 text-muted-foreground tabular-nums sm:inline">
                7 Oct 2026
              </span>
            </div>
            <button
              type="button"
              onClick={() => reading.current?.restart()}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:hidden"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Replay
            </button>
          </div>

          <div className="grid divide-y md:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] md:divide-x md:divide-y-0">
            <TranscriptPane />
            <PlanPane />
          </div>
        </figure>
      </div>
    </section>
  );
}

function TranscriptPane() {
  return (
    <div className="p-4 sm:p-6">
      <p className="text-xs font-medium text-muted-foreground">Transcript</p>
      <ol className="mt-3 space-y-2">
        {HERO_LINES.map((line, i) => {
          const [before, phrase, after] = line.text;
          const settled = line.kind !== "decision";
          return (
            <li
              key={`${line.time}-${i}`}
              data-line={i}
              className="grid grid-cols-[2.6rem_minmax(0,1fr)] items-baseline gap-x-3"
            >
              <time className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {line.time}
              </time>
              <p className="text-[13px] leading-[1.65] text-muted-foreground sm:text-sm sm:leading-[1.65]">
                <span className="font-medium text-foreground">{line.speaker}</span> {before}
                <span data-strike style={strikeStyle(settled)} className={cn(settled && "opacity-60")}>
                  <span
                    data-hl
                    style={highlightStyle(!settled)}
                    className="rounded-[3px] px-px font-medium text-foreground [box-decoration-break:clone]"
                  >
                    {phrase}
                  </span>
                </span>
                {after}
                {line.kind === "excluded" && (
                  <span
                    data-tag
                    className="ml-2 inline-flex -translate-y-px items-center rounded-md border bg-background px-1.5 align-middle text-[11px] leading-5 font-medium text-muted-foreground"
                  >
                    Left out
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PlanPane() {
  return (
    <div className="bg-[color-mix(in_oklch,var(--muted)_45%,var(--card))] p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Project</p>
          <p className="mt-1 text-[15px] font-semibold tracking-tight">{URBANCART.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Initials name={URBANCART.manager} />
            {URBANCART.manager}
          </p>
        </div>
        <p
          data-due
          className="mt-0.5 shrink-0 rounded-md border bg-background px-2 py-1 text-xs font-medium tabular-nums"
        >
          <span className="text-muted-foreground">Due </span>
          <Swap name="project" from={URBANCART.earlierDue} to={URBANCART.due} />
        </p>
      </div>

      <ul className="mt-5 border-t">
        {URBANCART_TASKS.map((task, i) => (
          <li
            key={task.title}
            data-row={i}
            className="relative grid grid-cols-[minmax(0,1fr)_auto_2.5rem] items-center gap-x-3 border-b py-2.5 sm:gap-x-4"
          >
            <span
              data-flash
              aria-hidden
              className="pointer-events-none absolute -inset-x-2 inset-y-1 rounded-md bg-primary/10 opacity-0"
            />
            <div className="relative min-w-0">
              <p className="text-[13px] leading-snug font-medium text-pretty sm:text-sm">{task.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Initials name={task.owner} className="size-4 text-[8px]" />
                {task.owner}
              </p>
            </div>
            <span className="relative text-xs text-muted-foreground tabular-nums sm:text-[13px]">
              {i === URBANCART_TASKS.length - 1 ? (
                <Swap name="task" from={URBANCART_EARLIER_TASK_DUE} to={task.due} />
              ) : (
                task.due
              )}
            </span>
            <span className="relative text-right text-[13px] font-medium tabular-nums sm:text-sm">
              {task.hours}h
            </span>
          </li>
        ))}
      </ul>

      <p
        data-total
        className="mt-3 flex items-center justify-between text-xs text-muted-foreground tabular-nums sm:text-[13px]"
      >
        <span>{URBANCART_TASKS.length} tasks</span>
        <span>
          Estimated <span className="font-medium text-foreground">{TOTAL_HOURS}h</span>
        </span>
      </p>
    </div>
  );
}

/** A value the meeting corrected: the earlier one sits underneath, hidden once replaced. */
function Swap({ name, from, to }: { name: string; from: string; to: string }) {
  return (
    <span data-swap={name} className="inline-grid">
      <span data-new className="[grid-area:1/1]">
        {to}
      </span>
      <span data-old aria-hidden className="opacity-0 [grid-area:1/1]">
        {from}
      </span>
    </span>
  );
}

/**
 * The demo reads the transcript line by line. Decisions get highlighted and land as
 * plan rows; when a later line corrects an earlier one, the old phrase is struck and
 * the plan value swaps. Ends on the same state the server rendered.
 */
function buildReading(scope: HTMLElement) {
  const one = (selector: string) => scope.querySelector<HTMLElement>(selector);
  const line = (i: number) => one(`[data-line="${i}"]`);
  const hl = (i: number) => one(`[data-line="${i}"] [data-hl]`);
  const strike = (i: number) => one(`[data-line="${i}"] [data-strike]`);
  const row = (i: number) => one(`[data-row="${i}"]`);
  const flash = (i: number) => one(`[data-row="${i}"] [data-flash]`);
  const due = one("[data-due]");

  // Start from an unread transcript and an empty plan.
  gsap.set(pick(scope, "[data-line]"), { opacity: 0.35 });
  gsap.set(pick(scope, "[data-hl]"), { backgroundSize: "0% 100%" });
  gsap.set(pick(scope, "[data-strike]"), { backgroundSize: "0% 1.5px", opacity: 1 });
  gsap.set(pick(scope, "[data-tag], [data-total], [data-row]"), { autoAlpha: 0 });
  gsap.set(pick(scope, "[data-row]"), { y: 10 });
  gsap.set(pick(scope, "[data-flash]"), { opacity: 0 });
  gsap.set(pick(scope, "[data-swap] [data-old]"), { autoAlpha: 1, y: 0 });
  gsap.set(pick(scope, "[data-swap] [data-new]"), { autoAlpha: 0, y: 6 });
  if (due) gsap.set(due, { autoAlpha: 0, y: 6 });

  const tl = gsap.timeline({ delay: 1.2, defaults: { ease: "expo.out" } });
  const at = (i: number, offset = 0) => i * STEP + offset;
  const add = (target: Element | null, vars: gsap.TweenVars, position: number) => {
    if (target) tl.to(target, vars, position);
  };
  const read = (i: number) => {
    add(line(i), { opacity: 1, duration: 0.35, ease: "power2.out" }, at(i));
    if (HERO_LINES[i]?.kind !== "excluded") {
      add(hl(i), { backgroundSize: "100% 100%", duration: 0.5, ease: "power2.inOut" }, at(i, 0.1));
    }
  };
  const land = (target: Element | null, position: number) =>
    add(target, { autoAlpha: 1, y: 0, duration: 0.7 }, position);
  const pulse = (i: number, position: number) => {
    const el = flash(i);
    if (el) {
      tl.fromTo(
        el,
        { opacity: 1 },
        { opacity: 0, duration: 1.4, ease: "power2.out", immediateRender: false },
        position,
      );
    }
  };
  const supersede = (i: number, position: number) => {
    add(hl(i), { backgroundSize: "0% 100%", duration: 0.35, ease: "power2.in" }, position);
    add(
      strike(i),
      { backgroundSize: "100% 1.5px", opacity: 0.6, duration: 0.45, ease: "power2.inOut" },
      position + 0.1,
    );
  };
  const swap = (name: string, position: number) => {
    add(
      one(`[data-swap="${name}"] [data-old]`),
      { autoAlpha: 0, y: -6, duration: 0.3, ease: "power2.in" },
      position,
    );
    add(one(`[data-swap="${name}"] [data-new]`), { autoAlpha: 1, y: 0, duration: 0.6 }, position + 0.15);
  };

  // "We initially discussed 18 October": a provisional project deadline.
  read(0);
  land(due, at(0, 0.3));

  // "Don't add a payment task or an inventory task": rejected scope stays out.
  read(1);
  add(
    strike(1),
    { backgroundSize: "100% 1.5px", opacity: 0.6, duration: 0.45, ease: "power2.inOut" },
    at(1, 0.15),
  );
  add(one("[data-tag]"), { autoAlpha: 1, duration: 0.4 }, at(1, 0.4));

  // Owners, dates and hours land as tasks.
  [2, 3, 4].forEach((lineIndex, rowIndex) => {
    read(lineIndex);
    land(row(rowIndex), at(lineIndex, 0.3));
    pulse(rowIndex, at(lineIndex, 0.3));
  });

  // "A six-hour estimate and a 17 October deadline."
  read(5);
  land(row(3), at(5, 0.3));
  pulse(3, at(5, 0.3));

  // "Please move that task to 19 October": the later line wins.
  read(6);
  supersede(5, at(6, 0.35));
  swap("task", at(6, 0.4));
  pulse(3, at(6, 0.4));

  // "The final UrbanCart project deadline is 20 October."
  read(7);
  supersede(0, at(7, 0.35));
  swap("project", at(7, 0.4));

  add(one("[data-total]"), { autoAlpha: 1, duration: 0.6 }, at(7, 0.9));

  return tl;
}
