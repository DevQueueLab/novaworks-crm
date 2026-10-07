"use client";

import { Check, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  "Reading the transcript",
  "Matching people to the NovaWorks directory",
  "Applying final decisions, dropping rejected scope",
  "Validating owners, dates and hours",
  "Saving everything in one transaction",
] as const;

const SECONDS_PER_STEP = 4;

/** Animated stand-in for the server action while the AI works (the action itself is a single request). */
export function RunProgress({ lineCount }: { lineCount: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const current = Math.min(Math.floor(elapsed / SECONDS_PER_STEP), STEPS.length - 1);
  // Creeps towards 95% so the bar never looks finished before the server answers.
  const percent = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / 18))) + 4);

  return (
    <Card
      className="gap-0 overflow-hidden rounded-xl py-0 animate-in fade-in slide-in-from-bottom-1 duration-300"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="relative h-1 w-full bg-muted"
        role="progressbar"
        aria-label="Planning progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="absolute inset-y-0 left-0 overflow-hidden bg-primary transition-[width] duration-1000 ease-out-expo"
          style={{ width: `${percent}%` }}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/3 animate-progress-sheen bg-linear-to-r from-transparent via-white/45 to-transparent"
          />
        </div>
      </div>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
            <FileText className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg leading-7 font-semibold tracking-tight">Turning the meeting into a plan…</h2>
            <p className="text-sm text-muted-foreground">
              Reading {lineCount.toLocaleString()} lines. Usually 10 to 60 seconds on the free model.
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs tabular-nums text-muted-foreground">
            {elapsed}s
          </span>
        </div>

        <ol className="space-y-1">
          {STEPS.map((label, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li
                key={label}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-300",
                  active && "bg-muted/60 font-medium text-foreground",
                  done && "text-foreground",
                  !done && !active && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums transition-colors duration-300",
                    done && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    active && "border-primary/40 bg-background text-primary",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5 animate-in zoom-in-50 duration-200" aria-hidden />
                  ) : active ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0">{label}</span>
              </li>
            );
          })}
        </ol>

        <p className="text-xs text-muted-foreground">
          Nothing is written until every owner, date and estimate checks out. It all saves together, or not at all.
        </p>
      </CardContent>
    </Card>
  );
}
