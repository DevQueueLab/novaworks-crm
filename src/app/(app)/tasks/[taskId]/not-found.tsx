import { ArrowLeft, ListChecks } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function TaskNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs">
          <ListChecks className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl leading-8 font-semibold tracking-tight">Task not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground text-pretty">
          It doesn’t exist or isn’t shared with your account.
        </p>
        <Button asChild className="mt-6">
          <Link href="/tasks">
            <ArrowLeft />
            Back to tasks
          </Link>
        </Button>
      </div>
    </div>
  );
}
