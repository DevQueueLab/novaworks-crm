"use client";

import { History, Loader2, Lock, Trash2, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { resetDemoData } from "@/actions/planning";
import { RoleBadge, UserAvatar } from "@/components/people";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MeetingImport } from "@/lib/data/team";
import type { DirectoryMember } from "@/lib/planning/types";

const HOW_IT_WORKS = [
  "Paste the transcript of a planning meeting.",
  "The AI reads the final decisions and ignores rejected scope.",
  "Owners, dates and hours are validated against your real team.",
  "Everything saves in one transaction, or nothing does.",
];

const importTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function SideCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-xl py-0">
      <CardContent className="space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

export function ImportSidebar({
  directory,
  recent,
  onReset,
}: {
  directory: DirectoryMember[];
  recent: MeetingImport[];
  onReset: () => void;
}) {
  const router = useRouter();
  const [isResetting, startReset] = useTransition();

  const roleOrder = { admin: 0, manager: 1, agent: 2 } as const;
  const team = directory
    .filter((member) => member.role !== "admin")
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name));

  function reset() {
    startReset(async () => {
      let result: { ok: boolean; message: string };
      try {
        result = await resetDemoData();
      } catch {
        result = { ok: false, message: "Could not reach the server. Please try again." };
      }
      startReset(() => {
        if (result.ok) {
          toast.success("Demo data reset", { description: result.message });
          onReset();
          router.refresh();
        } else {
          toast.error(result.message);
        }
      });
    });
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <Card className="gap-0 overflow-hidden rounded-xl py-0">
        <CardContent className="space-y-4 p-5">
          <h3 className="text-sm font-semibold">How it works</h3>
          <ol className="space-y-3">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Lock className="mt-px size-3.5 shrink-0" aria-hidden />
            The AI sees names, roles and skills. Never emails or passwords.
          </p>
        </CardContent>
      </Card>

      <SideCard title="Team the AI can assign" icon={Users}>
        <ul className="-mx-1 space-y-0.5">
          {team.map((member) => (
            <li key={member.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
              <UserAvatar name={member.name} code={member.code} size="sm" className="size-7" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium leading-tight">
                  <span className="truncate">{member.name}</span>
                  <span className="font-mono text-[11px] font-normal text-muted-foreground">{member.code}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.title}</p>
              </div>
              {member.role === "manager" && <RoleBadge role={member.role} className="text-[10px]" />}
            </li>
          ))}
        </ul>
      </SideCard>

      <SideCard title="Recent imports" icon={History}>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            No transcripts imported yet. Your first run will show up here.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {recent.map((item) => {
              const counts = item.summary?.counts;
              const projects = counts
                ? counts.projectsCreated + counts.projectsUpdated + counts.projectsUnchanged
                : null;
              const tasks = counts ? counts.tasksCreated + counts.tasksUpdated + counts.tasksUnchanged : null;
              const updated = counts ? counts.projectsUpdated + counts.tasksUpdated : 0;
              return (
                <li key={item.id} className="space-y-0.5 rounded-lg border bg-muted/20 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.title ?? "Untitled meeting"}</p>
                    <time
                      dateTime={new Date(item.createdAt).toISOString()}
                      suppressHydrationWarning
                      className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                    >
                      {importTime.format(new Date(item.createdAt))}
                    </time>
                  </div>
                  {projects !== null && tasks !== null && (
                    <p className="text-xs text-muted-foreground">
                      {projects} {projects === 1 ? "project" : "projects"} · {tasks} {tasks === 1 ? "task" : "tasks"}
                      {updated > 0 && (
                        <span className="text-amber-700 dark:text-amber-400"> · {updated} updated</span>
                      )}
                    </p>
                  )}
                  <p className="truncate font-mono text-[11px] text-muted-foreground/70">{item.model}</p>
                </li>
              );
            })}
          </ul>
        )}
      </SideCard>

      <Card className="gap-0 rounded-xl border-destructive/30 py-0">
        <CardContent className="space-y-3 p-5">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
            <p className="text-xs text-muted-foreground">
              Start the demo fresh. Generated projects, tasks and import history are removed.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isResetting}
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {isResetting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {isResetting ? "Resetting…" : "Reset demo data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Deletes all generated projects, tasks and import history. Demo users are kept.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={reset}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Reset everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </aside>
  );
}
