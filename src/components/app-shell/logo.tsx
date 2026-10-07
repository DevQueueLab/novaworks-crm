import Link from "next/link";

import { cn } from "@/lib/utils";

/** Calm monogram: solid primary square with an "N". No gradient, no glow. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[15px] leading-none font-semibold tracking-tight text-primary-foreground shadow-xs select-none",
        className,
      )}
    >
      N
    </span>
  );
}

export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <LogoMark />
      <span className="flex flex-col">
        <span className="text-sm leading-tight font-semibold tracking-tight">NovaWorks</span>
        <span className="text-[11px] leading-tight text-muted-foreground">Project CRM</span>
      </span>
    </Link>
  );
}
