"use client";

import { Ellipsis, KeyRound, Pencil, Search, UserCheck, UserX } from "lucide-react";
import { useState } from "react";

import { RoleBadge, UserAvatar } from "@/components/people";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole } from "@/db/schema";
import type { AdminUser } from "@/lib/data/admin";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";

import { plural } from "./form-field";
import { ResetPasswordDialog, UserStatusDialog } from "./user-dialogs";
import { EditUserSheet } from "./user-form-sheet";

type RoleFilter = "all" | UserRole;
type Panel = "edit" | "password" | "status";

const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "manager", label: "Managers" },
  { value: "agent", label: "Agents" },
  { value: "admin", label: "Admins" },
];

function matches(user: AdminUser, needle: string) {
  return [user.name, user.email, user.code, user.title, ...user.skills].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

function StatusLabel({ inactive }: { inactive: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", inactive && "text-muted-foreground")}>
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", inactive ? "bg-muted-foreground/40" : "bg-success")}
      />
      {inactive ? "Deactivated" : "Active"}
    </span>
  );
}

function Workload({ user }: { user: AdminUser }) {
  if (user.role === "agent") {
    if (user.openTaskCount === 0) return <span className="text-muted-foreground">No open tasks</span>;
    return (
      <span>
        {user.openTaskCount} open
        <span className="text-muted-foreground"> · {formatHours(user.openHours)}</span>
      </span>
    );
  }
  if (user.role === "manager") {
    if (user.projectCount === 0) return <span className="text-muted-foreground">No projects</span>;
    return <span>{plural(user.projectCount, "project")}</span>;
  }
  return <span className="text-muted-foreground">None</span>;
}

export function UsersTable({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");
  // The target outlives `panel`, so dialogs keep their content while animating closed.
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);

  const needle = query.trim().toLowerCase();
  const visible = users.filter(
    (user) => (filter === "all" || user.role === filter) && (!needle || matches(user, needle)),
  );
  const countFor = (value: RoleFilter) =>
    value === "all" ? users.length : users.filter((user) => user.role === value).length;

  function openPanel(user: AdminUser, next: Panel) {
    setTarget(user);
    setPanel(next);
  }

  function onPanelOpenChange(open: boolean) {
    if (!open) setPanel(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(FILTERS.find((item) => item.value === value)?.value ?? "all")}
        >
          <TabsList>
            {FILTERS.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="px-3">
                {item.label}
                <span className="text-xs font-normal text-muted-foreground tabular-nums">{countFor(item.value)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, code or skill"
            aria-label="Search users"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9 pl-4 text-xs font-medium text-muted-foreground">User</TableHead>
              <TableHead className="hidden h-9 text-xs font-medium text-muted-foreground sm:table-cell">Code</TableHead>
              <TableHead className="h-9 text-xs font-medium text-muted-foreground">Role</TableHead>
              <TableHead className="hidden h-9 text-xs font-medium text-muted-foreground lg:table-cell">
                Specialization
              </TableHead>
              <TableHead className="hidden h-9 text-xs font-medium text-muted-foreground xl:table-cell">Skills</TableHead>
              <TableHead className="hidden h-9 text-xs font-medium text-muted-foreground md:table-cell">Status</TableHead>
              <TableHead className="hidden h-9 text-right text-xs font-medium text-muted-foreground md:table-cell">
                Workload
              </TableHead>
              <TableHead className="h-9 w-12 pr-3">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {needle ? `No users match "${query.trim()}".` : "No users with this role yet."}
                  {(needle || filter !== "all") && (
                    <button
                      type="button"
                      className="ml-1.5 rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((user) => {
                const inactive = user.deactivatedAt !== null;
                const isSelf = user.id === currentUserId;
                const skills = user.skills.join(", ");
                return (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell className="py-2.5 pl-4">
                      <div className="flex max-w-72 min-w-0 items-center gap-3">
                        <UserAvatar
                          name={user.name}
                          code={user.code}
                          size="md"
                          className={cn(inactive && "opacity-50 grayscale")}
                        />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-baseline gap-1.5">
                            <span className={cn("truncate font-medium", inactive && "text-muted-foreground")}>
                              {user.name}
                            </span>
                            {isSelf && <span className="shrink-0 text-xs text-muted-foreground">(you)</span>}
                            {inactive && (
                              <span className="shrink-0 text-xs text-muted-foreground md:hidden">Deactivated</span>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-2.5 font-mono text-xs text-muted-foreground sm:table-cell">
                      {user.code}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="hidden py-2.5 lg:table-cell">
                      <span className="block max-w-44 truncate">{user.title}</span>
                    </TableCell>
                    <TableCell className="hidden py-2.5 xl:table-cell">
                      <span className="block max-w-56 truncate text-xs text-muted-foreground" title={skills}>
                        {skills || "None"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden py-2.5 md:table-cell">
                      <StatusLabel inactive={inactive} />
                    </TableCell>
                    <TableCell className="hidden py-2.5 text-right text-sm tabular-nums md:table-cell">
                      <Workload user={user} />
                    </TableCell>
                    <TableCell className="py-2.5 pr-3 text-right">
                      {/* Non-modal so closing the menu never fights the dialog it opens. */}
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${user.name}`}
                            className="text-muted-foreground data-[state=open]:bg-accent"
                          >
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onSelect={() => openPanel(user, "edit")}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          {!isSelf && (
                            <>
                              <DropdownMenuItem onSelect={() => openPanel(user, "password")}>
                                <KeyRound />
                                Reset password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {inactive ? (
                                <DropdownMenuItem onSelect={() => openPanel(user, "status")}>
                                  <UserCheck />
                                  Reactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem variant="destructive" onSelect={() => openPanel(user, "status")}>
                                  <UserX />
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {target && (
        <>
          <EditUserSheet
            user={target}
            isSelf={target.id === currentUserId}
            open={panel === "edit"}
            onOpenChange={onPanelOpenChange}
          />
          <ResetPasswordDialog user={target} open={panel === "password"} onOpenChange={onPanelOpenChange} />
          <UserStatusDialog user={target} open={panel === "status"} onOpenChange={onPanelOpenChange} />
        </>
      )}
    </div>
  );
}
