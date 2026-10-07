import type { ReactNode } from "react";

import { UserAvatar } from "@/components/people";
import { cn } from "@/lib/utils";

import styles from "./transcript-to-task.module.css";

function Extracted({ children, className }: { children: ReactNode; className?: string }) {
  return <mark className={cn(styles.mark, className)}>{children}</mark>;
}

/**
 * A real line from the bundled sample meeting (samples/novaworks-meeting.md, 09:08)
 * above the task NovaWorks saves from it. The marked words are the ones the owner,
 * estimate and deadline were read from; the row mirrors the project task table.
 */
export function TranscriptToTask({ className }: { className?: string }) {
  return (
    <figure
      className={cn("overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs", className)}
    >
      <figcaption className="sr-only">
        Example from a client planning meeting: one line of the transcript, and the task NovaWorks created
        from it.
      </figcaption>

      <div className="px-5 pt-4 pb-5">
        <p className="flex items-baseline gap-2">
          <span className="text-sm font-medium">Ali</span>
          <span className="text-xs text-muted-foreground tabular-nums">09:08</span>
        </p>
        <blockquote className="mt-1.5 text-[0.9375rem] leading-7 text-pretty">
          <Extracted className={styles.owner}>I can own</Extracted> the product catalog interface… Put that
          down as <Extracted className={styles.estimate}>12 estimated hours</Extracted>, due on{" "}
          <Extracted className={styles.deadline}>12 October</Extracted>.
        </blockquote>
      </div>

      <div className={styles.result}>
        <table className="w-full text-sm">
          <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="py-2 pr-4 pl-5 text-left font-medium">
                Task
              </th>
              <th scope="col" className="w-px py-2 pr-6 text-left font-medium whitespace-nowrap">
                Owner
              </th>
              <th scope="col" className="w-px py-2 pr-6 text-left font-medium whitespace-nowrap">
                Deadline
              </th>
              <th scope="col" className="w-px py-2 pr-5 text-right font-medium whitespace-nowrap">
                Est. hours
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3.5 pr-4 pl-5 leading-snug font-semibold">Product catalog UI</td>
              <td className="py-3.5 pr-6 whitespace-nowrap">
                <span className="flex items-center gap-2">
                  <UserAvatar name="Ali Raza" code="DEV01" size="sm" />
                  Ali Raza
                </span>
              </td>
              <td className="py-3.5 pr-6 whitespace-nowrap tabular-nums">12 Oct</td>
              <td className="py-3.5 pr-5 text-right font-medium whitespace-nowrap tabular-nums">12h</td>
            </tr>
          </tbody>
        </table>
      </div>
    </figure>
  );
}
