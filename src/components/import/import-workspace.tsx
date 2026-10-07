"use client";

import { CircleAlert, FileText, Info, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { applyReviewedDraft, createFromTranscript } from "@/actions/planning";
import { ImportSidebar } from "@/components/import/import-sidebar";
import { ResultView, plural } from "@/components/import/result-view";
import { ReviewForm } from "@/components/import/review-form";
import { RunProgress } from "@/components/import/run-progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MeetingImport } from "@/lib/data/team";
import type {
  ApplySummary,
  DirectoryMember,
  ImportResult,
  PlanDraft,
  PlanIssue,
} from "@/lib/planning/types";
import { cn } from "@/lib/utils";

const MAX_CHARS = 60_000;
const DEFAULT_REFERENCE_DATE = "2026-10-07";

type View =
  | { kind: "input" }
  | { kind: "applied"; summary: ApplySummary; model: string }
  | { kind: "needs_review"; draft: PlanDraft; issues: PlanIssue[]; model: string }
  | { kind: "error"; message: string };

const unreachable = (): ImportResult => ({
  status: "error",
  message: "Could not reach the server, so nothing was created. Check your connection and try again.",
});

export function ImportWorkspace({
  directory,
  recent,
  samples,
}: {
  directory: DirectoryMember[];
  recent: MeetingImport[];
  samples: { original: string; modified: string };
}) {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [referenceDate, setReferenceDate] = useState(DEFAULT_REFERENCE_DATE);
  const [view, setView] = useState<View>({ kind: "input" });
  const [reviewRound, setReviewRound] = useState(0);
  const [isCreating, startCreate] = useTransition();
  const [isSaving, startSave] = useTransition();

  const charCount = transcript.length;
  const lineCount = transcript ? transcript.split("\n").length : 0;
  const isEmpty = transcript.trim().length === 0;
  const tooLong = charCount > MAX_CHARS;
  const canSubmit = !isEmpty && !tooLong && !isCreating;
  const loadedSample =
    transcript === samples.original ? "original" : transcript === samples.modified ? "modified" : null;

  function showResult(result: ImportResult) {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });

    if (result.status === "applied") {
      const { counts } = result.summary;
      const projects = counts.projectsCreated + counts.projectsUpdated + counts.projectsUnchanged;
      const tasks = counts.tasksCreated + counts.tasksUpdated + counts.tasksUnchanged;
      setView({ kind: "applied", summary: result.summary, model: result.model });
      toast.success(`${plural(projects, "project")} and ${plural(tasks, "task")} saved`, {
        description: "Everything was written in a single transaction.",
      });
      router.refresh();
    } else if (result.status === "needs_review") {
      setReviewRound((round) => round + 1);
      setView({ kind: "needs_review", draft: result.draft, issues: result.issues, model: result.model });
      toast.warning("A few details need your input", { description: "Nothing has been saved yet." });
    } else {
      setView({ kind: "error", message: result.message });
      toast.error(result.message);
    }
  }

  function create() {
    if (!canSubmit) return;
    startCreate(async () => {
      let result: ImportResult;
      try {
        result = await createFromTranscript({ transcript, referenceDate: referenceDate || undefined });
      } catch {
        result = unreachable();
      }
      startCreate(() => showResult(result));
    });
  }

  function saveReviewed(draft: PlanDraft, model: string) {
    if (isSaving) return;
    startSave(async () => {
      let result: ImportResult;
      try {
        result = await applyReviewedDraft({
          transcript,
          draft,
          model: model.replace(/( · reviewed)+$/, ""),
        });
      } catch {
        result = unreachable();
      }
      startSave(() => showResult(result));
    });
  }

  const backToInput = () => setView({ kind: "input" });

  let main: ReactNode;
  if (isCreating) {
    main = <RunProgress lineCount={lineCount} />;
  } else if (view.kind === "applied") {
    main = (
      <ResultView summary={view.summary} model={view.model} directory={directory} onImportAnother={backToInput} />
    );
  } else if (view.kind === "needs_review") {
    main = (
      <ReviewForm
        key={reviewRound}
        initialDraft={view.draft}
        issues={view.issues}
        directory={directory}
        pending={isSaving}
        onSubmit={(draft) => saveReviewed(draft, view.model)}
        onStartOver={backToInput}
      />
    );
  } else if (view.kind === "error") {
    main = (
      <Card className="gap-0 rounded-xl py-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <CardContent className="space-y-4 p-6">
          <Alert variant="destructive" className="rounded-xl border-destructive/30 bg-destructive/5">
            <CircleAlert />
            <AlertTitle>Nothing was created</AlertTitle>
            <AlertDescription>{view.message}</AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Your transcript is still here and nothing was saved, so it is safe to try again.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={backToInput}>
              <RotateCcw />
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  } else {
    main = (
      <Card className="gap-0 overflow-hidden rounded-xl py-0 transition-shadow animate-in fade-in duration-300 focus-within:border-primary/40 focus-within:ring-[3px] focus-within:ring-primary/10">
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2.5 sm:px-4">
            <span className="mr-auto flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" />
              Meeting transcript
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setTranscript(samples.original)}
            >
              <FileText />
              Load sample transcript
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setTranscript(samples.modified)}
                >
                  <FileText />
                  Load modified sample
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-pretty">
                Same meeting, but QuickServe&apos;s mobile integration changes to 12h, due 23 Oct. Run it after the
                original to see updates instead of duplicates.
              </TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              disabled={isEmpty}
              onClick={() => setTranscript("")}
            >
              <X />
              Clear
            </Button>
          </div>
        </TooltipProvider>

        {loadedSample === "modified" && (
          <p className="flex items-start gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground animate-in fade-in">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Modified sample loaded.</span> QuickServe integration
              becomes 12h, due 23 Oct. Existing work is updated, not duplicated.
            </span>
          </p>
        )}

        <Label htmlFor="transcript" className="sr-only">
          Meeting transcript
        </Label>
        <Textarea
          id="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
          spellCheck={false}
          placeholder={
            "Paste the meeting transcript here…\n\nAyesha: Final recap. UrbanCart Website, client UrbanCart Clothing, manager Ayesha, deadline 20 October.\nAli owns Product catalog UI: 12 hours, 12 October…"
          }
          aria-invalid={tooLong || undefined}
          className="field-sizing-fixed h-[440px] min-h-[440px] resize-y rounded-none border-0 bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed shadow-none focus-visible:ring-0 sm:px-5 sm:py-4 lg:h-[520px] dark:bg-transparent"
        />

        <div className="flex flex-col gap-4 border-t bg-muted/20 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div className="space-y-1.5">
            <Label htmlFor="reference-date" className="text-xs font-medium text-muted-foreground">
              Reference date
            </Label>
            <Input
              id="reference-date"
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              className="h-9 w-full bg-background sm:w-44"
            />
            <p className="text-xs text-muted-foreground">Used to resolve dates without a year</p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <p
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                tooLong && "font-medium text-destructive",
              )}
            >
              {charCount.toLocaleString()}{" "}
              {tooLong ? `of ${MAX_CHARS.toLocaleString()} characters, too long` : "characters"}
              {" · "}
              {plural(lineCount, "line")}
            </p>
            <Button size="lg" disabled={!canSubmit} onClick={create} className="w-full sm:w-auto">
              Create from transcript
              <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1.5 font-mono text-[10px] font-medium opacity-80 sm:inline">
                Ctrl ↵
              </kbd>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Transcript import" className="min-w-0">
        {main}
      </section>
      <ImportSidebar
        directory={directory}
        recent={recent}
        onReset={() => {
          setView({ kind: "input" });
          setReviewRound(0);
        }}
      />
    </div>
  );
}
