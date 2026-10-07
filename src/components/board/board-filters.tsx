"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

import { KanbanBoard } from "@/components/board/kanban-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaskListItem } from "@/lib/data/tasks";

const ALL = "all";

type Option = { id: string; label: string };

/** Distinct options by id, sorted by label. */
function distinctOptions(entries: Option[]): Option[] {
  const byId = new Map<string, string>();
  for (const { id, label } of entries) if (!byId.has(id)) byId.set(id, label);
  return [...byId]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** The board with quick client-side filters: title search, project and owner. */
export function FilteredBoard({ tasks }: { tasks: TaskListItem[] }) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState(ALL);
  const [assigneeId, setAssigneeId] = useState(ALL);

  const projects = distinctOptions(tasks.map((task) => ({ id: task.project.id, label: task.project.name })));
  const people = distinctOptions(tasks.map((task) => ({ id: task.assignee.id, label: task.assignee.name })));

  const needle = query.trim().toLowerCase();
  const filtered = tasks.filter(
    (task) =>
      (projectId === ALL || task.project.id === projectId) &&
      (assigneeId === ALL || task.assignee.id === assigneeId) &&
      (needle === "" || task.title.toLowerCase().includes(needle)),
  );
  const isFiltered = needle !== "" || projectId !== ALL || assigneeId !== ALL;

  const projectLabel = projects.find((p) => p.id === projectId)?.label ?? "All projects";
  const personLabel = people.find((p) => p.id === assigneeId)?.label ?? "Everyone";

  function clearFilters() {
    setQuery("");
    setProjectId(ALL);
    setAssigneeId(ALL);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title"
            aria-label="Search tasks by title"
            className="pl-9"
          />
        </div>

        {projects.length > 1 && (
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger aria-label="Filter by project" className="max-w-60">
              <SelectValue>{projectLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {people.length > 1 && (
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger aria-label="Filter by owner" className="max-w-52">
              <SelectValue>{personLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Everyone</SelectItem>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isFiltered && (
          <>
            <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
              <X />
              Clear
            </Button>
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {filtered.length} of {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </span>
          </>
        )}
      </div>

      <KanbanBoard tasks={filtered} showProject />
    </div>
  );
}
