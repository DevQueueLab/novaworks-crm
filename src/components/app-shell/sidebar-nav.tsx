"use client";

import { FileText, FolderKanban, LayoutDashboard, ListChecks, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { UserRole } from "@/db/schema";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";

  const items: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/tasks", label: role === "agent" ? "My tasks" : "Tasks", icon: ListChecks },
    { href: "/team", label: "Team", icon: Users },
  ];

  return (
    <div className="flex flex-col gap-6">
      {role === "admin" && (
        <Button
          asChild
          className={cn(
            "h-9 w-full justify-start gap-2 rounded-lg shadow-xs",
            isActive(pathname, "/import") && "ring-2 ring-primary/30 ring-offset-2 ring-offset-sidebar",
          )}
        >
          <Link href="/import" onClick={onNavigate}>
            <FileText />
            Create from transcript
          </Link>
        </Button>
      )}

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        <p className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">Workspace</p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
