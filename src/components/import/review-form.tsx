"use client";

import { CircleAlert, CircleHelp, Loader2, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { UserAvatar } from "@/components/people";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  DirectoryMember,
  DraftProject,
  DraftTask,
  PlanDraft,
  PlanIssue,
} from "@/lib/planning/types";
import { cn } from "@/lib/utils";

const FIELD_PATH =
  /^projects\.\d+\.(name|clientName|managerCode|deadline|description|tasks\.\d+\.(title|assigneeCode|deadline|estimatedHours|description))$/;

export function ReviewForm({
  initialDraft,
  issues,
  directory,
  pending,
  onSubmit,
  onStartOver,
}: {
  initialDraft: PlanDraft;
  issues: PlanIssue[];
  directory: DirectoryMember[];
  pending: boolean;
  onSubmit: (draft: PlanDraft) => void;
  onStartOver: () => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [edited, setEdited] = useState<ReadonlySet<string>>(() => new Set<string>());

  const managers = directory.filter((member) => member.role === "manager");
  const agents = directory.filter((member) => member.role === "agent");

  const fieldIssues = new Map<string, string[]>();
  const generalIssues: PlanIssue[] = [];
  for (const issue of issues) {
    if (FIELD_PATH.test(issue.path)) {
      fieldIssues.set(issue.path, [...(fieldIssues.get(issue.path) ?? []), issue.message]);
    } else {
      generalIssues.push(issue);
    }
  }
  const remaining = [...fieldIssues.keys()].filter((path) => !edited.has(path)).length;

  const errorFor = (path: string) => (edited.has(path) ? undefined : fieldIssues.get(path)?.join(" "));

  function markEdited(path: string) {
    setEdited((prev) => (prev.has(path) ? prev : new Set(prev).add(path)));
  }

  function updateProject(p: number, patch: Partial<DraftProject>, path: string) {
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((project, i) => (i === p ? { ...project, ...patch } : project)),
    }));
    markEdited(path);
  }

  function updateTask(p: number, t: number, patch: Partial<DraftTask>, path: string) {
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((project, i) =>
        i === p
          ? { ...project, tasks: project.tasks.map((task, j) => (j === t ? { ...task, ...patch } : task)) }
          : project,
      ),
    }));
    markEdited(path);
  }

  const nullable = (value: string) => (value.trim() ? value : null);

  return (
    <form
      className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) onSubmit(draft);
      }}
    >
      <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
        <TriangleAlert />
        <AlertTitle>A few details need your input. Nothing has been saved yet.</AlertTitle>
        <AlertDescription className="text-amber-900/80 dark:text-amber-100/80">
          <p>
            {remaining > 0
              ? `${remaining} highlighted ${remaining === 1 ? "field needs" : "fields need"} a decision. Fix them below, then validate and save.`
              : "All highlighted fields have been edited. Validate & save to check the plan again."}
          </p>
          {generalIssues.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4">
              {generalIssues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          )}
        </AlertDescription>
      </Alert>

      {draft.openQuestions.length > 0 && (
        <Card className="gap-0 rounded-xl py-0">
          <CardContent className="space-y-2.5 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CircleHelp className="size-4 text-muted-foreground" aria-hidden />
              Open questions from the AI
            </h3>
            <ul className="space-y-1.5">
              {draft.openQuestions.map((question) => (
                <li
                  key={question}
                  className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                >
                  {question}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {draft.projects.map((project, p) => {
        const at = `projects.${p}`;
        const projectIssueCount = [...fieldIssues.keys()].filter(
          (path) => path.startsWith(`${at}.`) && !edited.has(path),
        ).length;

        return (
          <Card key={p} className="gap-0 overflow-hidden rounded-xl py-0">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground tabular-nums">Project {p + 1}</p>
                <p className="truncate text-sm font-semibold">{project.name || "Untitled project"}</p>
              </div>
              {projectIssueCount > 0 ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                  {projectIssueCount} to fix
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="shrink-0 border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                >
                  Looks good
                </Badge>
              )}
            </div>

            <CardContent className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${at}.name`} label="Project name" error={errorFor(`${at}.name`)}>
                  <Input
                    id={`${at}.name`}
                    value={project.name}
                    aria-invalid={!!errorFor(`${at}.name`) || undefined}
                    className={cn(errorFor(`${at}.name`) && "border-destructive")}
                    onChange={(e) => updateProject(p, { name: e.target.value }, `${at}.name`)}
                  />
                </Field>
                <Field id={`${at}.clientName`} label="Client" error={errorFor(`${at}.clientName`)}>
                  <Input
                    id={`${at}.clientName`}
                    value={project.clientName ?? ""}
                    placeholder="Client organisation"
                    aria-invalid={!!errorFor(`${at}.clientName`) || undefined}
                    className={cn(errorFor(`${at}.clientName`) && "border-destructive")}
                    onChange={(e) =>
                      updateProject(p, { clientName: nullable(e.target.value) }, `${at}.clientName`)
                    }
                  />
                </Field>
                <Field id={`${at}.managerCode`} label="Project manager" error={errorFor(`${at}.managerCode`)}>
                  <PersonSelect
                    id={`${at}.managerCode`}
                    value={project.managerCode}
                    people={managers}
                    placeholder="Choose a manager"
                    invalid={!!errorFor(`${at}.managerCode`)}
                    onChange={(code) => updateProject(p, { managerCode: code }, `${at}.managerCode`)}
                  />
                </Field>
                <Field id={`${at}.deadline`} label="Project deadline" error={errorFor(`${at}.deadline`)}>
                  <Input
                    id={`${at}.deadline`}
                    type="date"
                    value={project.deadline ?? ""}
                    aria-invalid={!!errorFor(`${at}.deadline`) || undefined}
                    className={cn(errorFor(`${at}.deadline`) && "border-destructive")}
                    onChange={(e) => updateProject(p, { deadline: e.target.value || null }, `${at}.deadline`)}
                  />
                </Field>
                <Field
                  id={`${at}.description`}
                  label="Description"
                  error={errorFor(`${at}.description`)}
                  className="sm:col-span-2"
                >
                  <Textarea
                    id={`${at}.description`}
                    value={project.description}
                    rows={2}
                    aria-invalid={!!errorFor(`${at}.description`) || undefined}
                    className={cn("min-h-16 text-sm", errorFor(`${at}.description`) && "border-destructive")}
                    onChange={(e) => updateProject(p, { description: e.target.value }, `${at}.description`)}
                  />
                </Field>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Tasks <span className="font-normal text-muted-foreground tabular-nums">{project.tasks.length}</span>
                </p>
                {project.tasks.length === 0 && (
                  <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                    No tasks were extracted for this project.
                  </p>
                )}
                {project.tasks.map((task, t) => {
                  const tat = `${at}.tasks.${t}`;
                  const taskHasIssue = [...fieldIssues.keys()].some(
                    (path) => path.startsWith(`${tat}.`) && !edited.has(path),
                  );
                  return (
                    <div
                      key={t}
                      className={cn(
                        "grid gap-3 rounded-lg border bg-background/50 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_96px]",
                        taskHasIssue && "border-amber-500/40 bg-amber-500/5",
                      )}
                    >
                      <Field id={`${tat}.title`} label="Task" error={errorFor(`${tat}.title`)}>
                        <Input
                          id={`${tat}.title`}
                          value={task.title}
                          aria-invalid={!!errorFor(`${tat}.title`) || undefined}
                          className={cn("font-medium", errorFor(`${tat}.title`) && "border-destructive")}
                          onChange={(e) => updateTask(p, t, { title: e.target.value }, `${tat}.title`)}
                        />
                      </Field>
                      <Field id={`${tat}.assigneeCode`} label="Owner" error={errorFor(`${tat}.assigneeCode`)}>
                        <PersonSelect
                          id={`${tat}.assigneeCode`}
                          value={task.assigneeCode}
                          people={agents}
                          placeholder="Choose an owner"
                          invalid={!!errorFor(`${tat}.assigneeCode`)}
                          onChange={(code) => updateTask(p, t, { assigneeCode: code }, `${tat}.assigneeCode`)}
                        />
                      </Field>
                      <Field id={`${tat}.deadline`} label="Deadline" error={errorFor(`${tat}.deadline`)}>
                        <Input
                          id={`${tat}.deadline`}
                          type="date"
                          value={task.deadline ?? ""}
                          aria-invalid={!!errorFor(`${tat}.deadline`) || undefined}
                          className={cn(errorFor(`${tat}.deadline`) && "border-destructive")}
                          onChange={(e) => updateTask(p, t, { deadline: e.target.value || null }, `${tat}.deadline`)}
                        />
                      </Field>
                      <Field id={`${tat}.estimatedHours`} label="Hours" error={errorFor(`${tat}.estimatedHours`)}>
                        <Input
                          id={`${tat}.estimatedHours`}
                          type="number"
                          inputMode="decimal"
                          step={0.5}
                          min={0.5}
                          value={task.estimatedHours ?? ""}
                          aria-invalid={!!errorFor(`${tat}.estimatedHours`) || undefined}
                          className={cn("tabular-nums", errorFor(`${tat}.estimatedHours`) && "border-destructive")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const hours = Number(raw);
                            updateTask(
                              p,
                              t,
                              { estimatedHours: raw === "" || !Number.isFinite(hours) ? null : hours },
                              `${tat}.estimatedHours`,
                            );
                          }}
                        />
                      </Field>
                      <Field
                        id={`${tat}.description`}
                        label="Description"
                        error={errorFor(`${tat}.description`)}
                        className="sm:col-span-2 xl:col-span-4"
                      >
                        <Textarea
                          id={`${tat}.description`}
                          value={task.description}
                          rows={2}
                          aria-invalid={!!errorFor(`${tat}.description`) || undefined}
                          className={cn(
                            "min-h-14 text-sm",
                            errorFor(`${tat}.description`) && "border-destructive",
                          )}
                          onChange={(e) => updateTask(p, t, { description: e.target.value }, `${tat}.description`)}
                        />
                      </Field>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border bg-background/85 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:flex-row sm:items-center sm:justify-between">
        <p className="px-1 text-sm text-muted-foreground">
          {remaining > 0
            ? `${remaining} ${remaining === 1 ? "field" : "fields"} still highlighted`
            : "Ready to validate. Everything saves in one transaction."}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onStartOver} disabled={pending}>
            <RotateCcw />
            Start over
          </Button>
          <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
            {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            {pending ? "Validating…" : "Validate & save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && (
        <p className="flex items-start gap-1 text-xs text-destructive animate-in fade-in">
          <CircleAlert className="mt-px size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function PersonSelect({
  id,
  value,
  people,
  placeholder,
  invalid,
  onChange,
}: {
  id: string;
  value: string | null;
  people: DirectoryMember[];
  placeholder: string;
  invalid: boolean;
  onChange: (code: string) => void;
}) {
  const known = people.some((person) => person.code === value);
  return (
    <Select value={known && value ? value : ""} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn("w-full min-w-0", invalid && "border-destructive")}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {people.map((person) => (
          <SelectItem key={person.code} value={person.code}>
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar name={person.name} code={person.code} size="sm" className="size-5" />
              <span className="truncate">{person.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{person.code}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
