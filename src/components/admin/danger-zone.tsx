"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { resetDemoData } from "@/actions/planning";
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

import { safeAction } from "./form-field";
import { SettingsSection } from "./settings-section";

export function DangerZone() {
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      const result = await safeAction(() => resetDemoData());
      if (result.ok) toast.success("Demo data reset", { description: result.message });
      else toast.error(result.message);
    });
  }

  return (
    <SettingsSection
      id="danger"
      tone="danger"
      title="Danger zone"
      description="Actions here can't be undone."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">Reset demo data</p>
          <p className="text-sm text-muted-foreground text-pretty">
            Removes every generated project, task, client and transcript import, including project channels. Users
            and settings stay.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {pending ? "Resetting…" : "Reset demo data"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                Deletes all generated projects, tasks, clients and import history. Users and settings are kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={reset}>
                Reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsSection>
  );
}
