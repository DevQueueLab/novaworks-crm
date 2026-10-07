import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/db/schema";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const palette = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
];

/** Stable colour per person, derived from their directory code. */
function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

const sizes = { sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-10 text-sm" } as const;

export function UserAvatar({
  name,
  code,
  size = "md",
  className,
}: {
  name: string;
  code?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Avatar className={cn(sizes[size], className)}>
      <AvatarFallback className={cn("font-semibold", colorFor(code ?? name))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({
  people,
  max = 4,
}: {
  people: { id: string; name: string; code?: string }[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const hidden = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p) => (
        <span key={p.id} title={p.name} className="rounded-full ring-2 ring-card">
          <UserAvatar name={p.name} code={p.code} size="sm" />
        </span>
      ))}
      {hidden > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
          +{hidden}
        </span>
      )}
    </div>
  );
}

const roleStyles: Record<UserRole, { label: string; className: string }> = {
  admin: {
    label: "Admin",
    className: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  manager: {
    label: "Manager",
    className: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  agent: {
    label: "Agent",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const style = roleStyles[role];
  return (
    <Badge variant="outline" className={cn("font-medium", style.className, className)}>
      {style.label}
    </Badge>
  );
}
