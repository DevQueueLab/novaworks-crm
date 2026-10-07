import Link from "next/link";

import { LogoMark } from "@/components/app-shell/logo";
import { container } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#security", label: "Security" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className={cn(container, "flex h-16 items-center justify-between gap-6")}>
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <LogoMark className="size-7 rounded-md text-[13px]" />
          <span className="text-[15px] font-semibold tracking-tight">NovaWorks</span>
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-lg border bg-background px-3.5 text-sm font-medium outline-none transition-[background-color,translate] duration-150 hover:bg-accent hover:text-accent-foreground active:translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
