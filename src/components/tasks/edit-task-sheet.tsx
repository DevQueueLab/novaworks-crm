"use client";

import { CircleAlert, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { updateTask, type TaskActionResult } from "@/actions/tasks";
import { UserAvatar } from "@/components/people";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

export type EditableTask = {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  estimatedHours: number;
};

export type AgentOption = { id: string; code: string; name: string; title: string };

type FormState = { title: string; description: string; assigneeId: string; dueDate: string; hours: string };

const toForm = (task: EditableTask): FormState => ({
  title: task.title,
  description: task.description,
  assigneeId: task.assigneeId,
  dueDate: task.dueDate,
  hours: String(task.estimatedHours),
});

export function EditTaskSheet({
  task,
  agents,
  projectDeadline,
}: {
  task: EditableTask;
  agents: AgentOption[];
  projectDeadline: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(task));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function onOpenChange(next: boolean) {
    if (isSaving) return;
    // Start every edit from the latest saved values (the page refreshes in the background).
    if (next) {
      setForm(toForm(task));
      setError(null);
    }
    setOpen(next);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): string | null {
    const hours = Number(form.hours);
    if (!form.title.trim()) return "Title is required.";
    if (!form.assigneeId) return "Choose an owner.";
    if (!form.dueDate) return "Choose a deadline.";
    if (form.dueDate > projectDeadline) {
      return `The deadline can't be after the project deadline (${formatDate(projectDeadline)}).`;
    }
    if (form.hours.trim() === "" || !Number.isFinite(hours) || hours <= 0) return "Hours must be more than zero.";
    if (hours > 1000) return "Hours can be at most 1,000.";
    return null;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const problem = validate();
    setError(problem);
    if (problem) return;

    startSaving(async () => {
      let result: TaskActionResult;
      try {
        result = await updateTask({
          taskId: task.id,
          title: form.title,
          description: form.description,
          assigneeId: form.assigneeId,
          dueDate: form.dueDate,
          estimatedHours: Number(form.hours),
        });
      } catch {
        result = { ok: false, message: "Could not reach the server. Please try again." };
      }
      startSaving(() => {
        if (result.ok) {
          setOpen(false);
          toast.success("Task updated");
          router.refresh();
        } else {
          setError(result.message);
        }
      });
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Edit
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>Edit task</SheetTitle>
            <SheetDescription>Changes are recorded in the discussion.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <Field id="task-title" label="Title">
              <Input
                id="task-title"
                value={form.title}
                maxLength={200}
                required
                onChange={(e) => setField("title", e.target.value)}
              />
            </Field>

            <Field id="task-description" label="Description">
              <Textarea
                id="task-description"
                value={form.description}
                maxLength={4000}
                rows={5}
                className="max-h-80"
                placeholder="Scope, links and anything the owner should know"
                onChange={(e) => setField("description", e.target.value)}
              />
            </Field>

            <Field id="task-owner" label="Owner">
              <Select value={form.assigneeId} onValueChange={(value) => setField("assigneeId", value)}>
                <SelectTrigger id="task-owner" className="w-full min-w-0">
                  <SelectValue placeholder="Choose an owner" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <span className="flex min-w-0 items-center gap-2">
                        <UserAvatar name={agent.name} code={agent.code} size="sm" className="size-5" />
                        <span className="truncate">{agent.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{agent.title}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field id="task-deadline" label="Deadline">
                <Input
                  id="task-deadline"
                  type="date"
                  value={form.dueDate}
                  max={projectDeadline}
                  required
                  className="tabular-nums"
                  onChange={(e) => setField("dueDate", e.target.value)}
                />
              </Field>
              <Field id="task-hours" label="Hours">
                <Input
                  id="task-hours"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  max={1000}
                  required
                  value={form.hours}
                  className="tabular-nums"
                  onChange={(e) => setField("hours", e.target.value)}
                />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Due on or before the project deadline,{" "}
              <span className="tabular-nums">{formatDate(projectDeadline)}</span>.
            </p>
          </div>

          <SheetFooter className="border-t">
            {error && (
              <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isSaving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
