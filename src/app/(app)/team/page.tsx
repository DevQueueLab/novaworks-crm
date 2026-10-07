import { Users } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { UserAvatar } from "@/components/people";
import type { UserRole } from "@/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { listTeam, type TeamMember } from "@/lib/data/team";

export const metadata: Metadata = { title: "Team" };

const sections: { role: UserRole; title: string; description: string }[] = [
  { role: "admin", title: "Administrator", description: "Owns the workspace and turns transcripts into plans." },
  { role: "manager", title: "Project managers", description: "Lead delivery and review what the AI proposes." },
  { role: "agent", title: "Developers", description: "Build and ship the tasks assigned to them." },
];

function MemberRow({ member, isYou }: { member: TeamMember; isYou: boolean }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3.5 sm:px-5 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_15rem] md:items-center md:gap-6">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={member.name} code={member.code} size="md" />
        <div className="min-w-0">
          <p className="flex min-w-0 items-baseline gap-1.5 text-sm font-medium">
            <span className="truncate">{member.name}</span>
            {isYou && <span className="shrink-0 text-xs font-normal text-muted-foreground">(you)</span>}
          </p>
          <p className="truncate text-sm text-muted-foreground">{member.title}</p>
        </div>
      </div>

      <p className="min-w-0 pl-11 text-xs leading-5 text-muted-foreground md:truncate md:pl-0">
        {member.skills.length > 0 ? member.skills.join(", ") : null}
      </p>

      <p className="flex min-w-0 items-center gap-2 pl-11 text-xs text-muted-foreground md:justify-end md:pl-0">
        <span className="shrink-0 font-mono">{member.code}</span>
        <span aria-hidden>·</span>
        <a
          href={`mailto:${member.email}`}
          className="truncate rounded-sm underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {member.email}
        </a>
      </p>
    </li>
  );
}

export default async function TeamPage() {
  const user = await requireUser();
  const team = await listTeam();

  return (
    <>
      <PageHeader
        title="Team"
        count={team.length}
        description="Read-only directory of the people the AI can assign. Accounts are seeded, so there is no signup."
      />

      {team.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Seed the database to load the NovaWorks directory."
        />
      ) : (
        <div className="space-y-8">
          {sections.map(({ role, title, description }) => {
            const members = team.filter((member) => member.role === role);
            if (members.length === 0) return null;
            return (
              <section key={role} aria-labelledby={`team-${role}`} className="space-y-3">
                <div>
                  <h2 id={`team-${role}`} className="text-base leading-7 font-semibold tracking-tight">
                    {title}
                    <span className="ml-2 font-normal text-muted-foreground tabular-nums">{members.length}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
                  {members.map((member) => (
                    <MemberRow key={member.id} member={member} isYou={member.id === user.id} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
