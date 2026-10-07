"use client";

import { Check, ChevronsUpDown, CircleUserRound, Loader2, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useFormStatus } from "react-dom";

import { logout } from "@/actions/auth";
import { RoleBadge, UserAvatar } from "@/components/people";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { ShellUser } from "./types";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function LogoutItem() {
  const { pending } = useFormStatus();
  return (
    <DropdownMenuItem
      asChild
      // Keep the menu mounted so the form submission is never cut short.
      onSelect={(event) => event.preventDefault()}
      className="w-full cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
    >
      <button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="animate-spin text-current" />
        ) : (
          <LogOut className="text-current" />
        )}
        {pending ? "Signing out…" : "Log out"}
      </button>
    </DropdownMenuItem>
  );
}

export function UserMenu({
  user,
  compact = false,
  onNavigate,
}: {
  user: ShellUser;
  compact?: boolean;
  /** Called when a menu link is followed (closes the mobile sheet). */
  onNavigate?: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label="Open account menu"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <UserAvatar name={user.name} code={user.code} version={user.avatarVersion} size="md" />
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent"
          >
            <UserAvatar name={user.name} code={user.code} version={user.avatarVersion} size="lg" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <RoleBadge role={user.role} className="px-1.5 py-0 text-[10px]" />
              </span>
              <span className="truncate text-xs text-muted-foreground">{user.title}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={compact ? "bottom" : "top"}
        align={compact ? "end" : "start"}
        sideOffset={8}
        className={cn(
          "rounded-xl",
          compact ? "w-64" : "w-(--radix-dropdown-menu-trigger-width) min-w-56",
        )}
      >
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar name={user.name} code={user.code} version={user.avatarVersion} size="md" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile" onClick={onNavigate}>
            <CircleUserRound />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="py-1 text-xs font-normal text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {themes.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem
              key={value}
              onSelect={(event) => {
                event.preventDefault();
                setTheme(value);
              }}
            >
              <Icon />
              {label}
              {theme === value && <Check className="ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <form action={logout}>
          <LogoutItem />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
