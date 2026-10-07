import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 px-6 py-14 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground text-pretty">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
