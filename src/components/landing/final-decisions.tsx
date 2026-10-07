import { ArrowRight } from "lucide-react";

import { CORRECTIONS } from "@/components/landing/content";
import { FinalDecisionsMotion } from "@/components/landing/final-decisions-motion";
import { container, sectionLead, sectionTitle, strikeStyle } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

export function FinalDecisions() {
  return (
    <section id="decisions" aria-labelledby="decisions-title" className="scroll-mt-16 border-t">
      <div className={cn(container, "py-24 sm:py-32")}>
        <h2 id="decisions-title" className={sectionTitle}>
          The last word wins.
        </h2>
        <p className={sectionLead}>
          People change their minds mid-meeting. NovaWorks keeps the corrected value, and the closing
          recap settles anything still open.
        </p>

        <FinalDecisionsMotion className="mt-12 sm:mt-16">
          <ol className="divide-y border-y">
            {CORRECTIONS.map((item) => (
              <li
                key={item.subject}
                data-diff-row
                className="grid gap-x-10 gap-y-4 py-8 sm:py-10 lg:grid-cols-12 lg:items-center"
              >
                <div className="lg:col-span-4">
                  <p className="text-sm text-muted-foreground">{item.field}</p>
                  <p className="mt-1 text-base font-medium tracking-tight text-pretty sm:text-lg">
                    {item.subject}
                  </p>
                </div>

                <p className="flex items-center gap-3 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums lg:col-span-3">
                  <span
                    data-strike
                    style={strikeStyle(true, 2)}
                    className="font-medium text-muted-foreground"
                  >
                    {item.from}
                  </span>
                  <ArrowRight aria-hidden className="size-5 shrink-0 text-muted-foreground/70" />
                  <span className="sr-only">changed to</span>
                  <span data-new className="text-primary">
                    {item.to}
                  </span>
                </p>

                <blockquote className="lg:col-span-5">
                  <p className="max-w-[52ch] text-[15px] leading-relaxed text-pretty">
                    “{item.quote}”
                  </p>
                  <footer className="mt-2 flex items-baseline gap-2 text-sm text-muted-foreground">
                    <span>{item.speaker}</span>
                    <time className="font-mono text-xs tabular-nums">{item.time}</time>
                  </footer>
                </blockquote>
              </li>
            ))}
          </ol>
        </FinalDecisionsMotion>
      </div>
    </section>
  );
}
