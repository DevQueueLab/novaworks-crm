import { Cpu, KeyRound, Lock, ShieldCheck } from "lucide-react";

import { container, sectionLead, sectionTitle, tintedSurface } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

const POINTS = [
  {
    icon: KeyRound,
    title: "Server-side sessions",
    body: "Every page and API call looks up the session on the server before any data is read.",
  },
  {
    icon: Lock,
    title: "Argon2id passwords",
    body: "Passwords are hashed with Argon2id. Only the hash is ever stored.",
  },
  {
    icon: ShieldCheck,
    title: "Role checks in SQL",
    body: "Admins see everything, managers their projects, developers their own tasks. The filter is part of the query.",
  },
  {
    icon: Cpu,
    title: "Private from the AI",
    body: "The model reads the transcript and your team’s names and roles. It never sees emails or passwords.",
  },
] as const;

export function Security() {
  return (
    <section
      id="security"
      aria-labelledby="security-title"
      className={cn("scroll-mt-16 border-t", tintedSurface)}
    >
      <div className={cn(container, "grid gap-12 py-24 sm:py-28 lg:grid-cols-12 lg:gap-x-12")}>
        <div className="lg:col-span-5">
          <h2 id="security-title" className={sectionTitle}>
            Access is enforced where the data lives.
          </h2>
          <p className={sectionLead}>
            A developer’s view never contains anyone else’s tasks, because the database never
            returns them.
          </p>
        </div>

        <dl className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:col-span-7">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="border-t border-foreground/10 pt-5">
              <dt className="flex items-center gap-2 text-[15px] font-medium">
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {title}
              </dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-muted-foreground text-pretty">
                {body}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
