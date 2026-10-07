import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  count,
  description,
  actions,
}: {
  /** Optional quiet context line (sentence case, muted). Prefer leaving it out. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Optional item count shown in muted figures beside the title. */
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">{eyebrow}</div>
        )}
        <h1 className="text-2xl leading-8 font-semibold tracking-tight text-balance">
          {title}
          {count !== undefined && (
            <span className="ml-2.5 font-medium text-muted-foreground/80 tabular-nums">{count}</span>
          )}
        </h1>
        {description && (
          <p className="max-w-[65ch] text-sm leading-6 text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
