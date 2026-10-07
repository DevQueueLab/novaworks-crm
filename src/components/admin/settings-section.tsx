import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One settings card: title and description, the controls, then an optional
 * muted footer bar for help text and the save button.
 */
export function SettingsSection({
  id,
  title,
  description,
  children,
  footer,
  tone = "default",
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs",
        tone === "danger" && "border-destructive/30",
      )}
    >
      <div className="space-y-1 px-5 pt-5">
        <h2
          id={`${id}-title`}
          className={cn("text-base leading-7 font-semibold tracking-tight", tone === "danger" && "text-destructive")}
        >
          {title}
        </h2>
        {description && (
          <div className="max-w-[65ch] text-sm leading-6 text-muted-foreground text-pretty">{description}</div>
        )}
      </div>
      <div className="px-5 pt-4 pb-5">{children}</div>
      {footer && (
        <div className="flex flex-col gap-3 border-t bg-muted/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          {footer}
        </div>
      )}
    </section>
  );
}
