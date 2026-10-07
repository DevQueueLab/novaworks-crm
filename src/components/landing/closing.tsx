import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { LogoMark } from "@/components/app-shell/logo";
import { container, primaryCta } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="border-t">
      <div className={cn(container, "py-24 sm:py-36")}>
        <h2
          id="closing-title"
          className="max-w-[16ch] text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.04] font-semibold tracking-[-0.038em] text-balance"
        >
          Paste your next meeting.
        </h2>
        <p className="mt-5 max-w-[44ch] text-lg leading-relaxed text-muted-foreground text-pretty">
          Sign in and turn it into projects and tasks your team can start on.
        </p>
        <div className="mt-9">
          <Link href="/login" className={primaryCta}>
            Sign in
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div
        className={cn(
          container,
          "flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <p className="flex items-center gap-2.5">
          <LogoMark className="size-6 rounded-md text-xs" />
          <span className="font-medium text-foreground">NovaWorks CRM</span>
        </p>
        <p>Built by DevQueue · Infinity Hack ’26</p>
      </div>
    </footer>
  );
}
