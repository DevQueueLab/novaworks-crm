"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { updateTaskStatus, type TaskActionResult } from "@/actions/tasks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/task-status";

import { StatusIcon } from "./task-status";

export function TaskStatusSelect({
  taskId,
  status,
  disabled = false,
}: {
  taskId: string;
  status: TaskStatus;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Shows the new status at once; falls back to the server value if the move fails.
  const [shown, setShown] = useOptimistic(status);

  function move(value: string) {
    const next = TASK_STATUSES.find((candidate) => candidate === value);
    if (!next || next === shown) return;

    startTransition(async () => {
      setShown(next);
      let result: TaskActionResult;
      try {
        result = await updateTaskStatus(taskId, next);
      } catch {
        result = { ok: false, message: "Could not reach the server. Please try again." };
      }
      startTransition(() => {
        if (result.ok) {
          toast.success(`Moved to ${TASK_STATUS_LABEL[next]}`);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      });
    });
  }

  return (
    <Select value={shown} onValueChange={move} disabled={disabled}>
      <SelectTrigger size="sm" aria-label={`Status: ${TASK_STATUS_LABEL[shown]}`} className="min-w-36">
        {/* Explicit children render on the server too, so the trigger never flashes empty. */}
        <SelectValue>
          <StatusIcon status={shown} />
          {TASK_STATUS_LABEL[shown]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {TASK_STATUSES.map((value) => (
          <SelectItem key={value} value={value}>
            <StatusIcon status={value} />
            {TASK_STATUS_LABEL[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
