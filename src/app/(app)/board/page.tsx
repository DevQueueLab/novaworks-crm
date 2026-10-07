import { SquareKanban } from "lucide-react";
import type { Metadata } from "next";

import { FilteredBoard } from "@/components/board/board-filters";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser, type SessionUser } from "@/lib/auth/dal";
import { listTasks } from "@/lib/data/tasks";

export const metadata: Metadata = { title: "Board" };

const copy: Record<SessionUser["role"], { description: string; empty: string }> = {
  admin: {
    description: "All tasks across NovaWorks by status. Drag a card to another column to update it.",
    empty: "Create projects from a meeting transcript and their tasks will show up here.",
  },
  manager: {
    description: "Tasks in your projects by status. Drag a card to another column to update it.",
    empty: "Tasks on the projects you manage will show up here.",
  },
  agent: {
    description: "Your tasks by status. Drag a card to another column to update it.",
    empty: "When a manager assigns you work from a meeting, it shows up here.",
  },
};

export default async function BoardPage() {
  const user = await requireUser();
  const tasks = await listTasks(user);
  const text = copy[user.role];

  return (
    <div className="space-y-6">
      <PageHeader title="Board" count={tasks.length} description={text.description} />

      {tasks.length === 0 ? (
        <EmptyState icon={SquareKanban} title="No tasks yet" description={text.empty} />
      ) : (
        <FilteredBoard tasks={tasks} />
      )}
    </div>
  );
}
