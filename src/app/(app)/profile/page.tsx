import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AvatarUpload } from "@/components/avatar-upload";
import { PageHeader } from "@/components/page-header";
import { RoleBadge } from "@/components/people";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Profile" };

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium">{children}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Profile" description="Your photo and the account details your teammates see." />

      <div className="max-w-3xl space-y-6">
        <section
          aria-labelledby="profile-photo-title"
          className="rounded-xl border bg-card text-card-foreground shadow-xs"
        >
          <div className="space-y-1 px-5 pt-5">
            <h2 id="profile-photo-title" className="text-base leading-7 font-semibold tracking-tight">
              Photo
            </h2>
            <p className="max-w-[65ch] text-sm leading-6 text-muted-foreground text-pretty">
              Shown next to your name on projects, tasks and messages. Only signed-in teammates can see it.
            </p>
          </div>
          <div className="px-5 pt-4 pb-5">
            <AvatarUpload name={user.name} code={user.code} version={user.avatarVersion} />
          </div>
        </section>

        <section
          aria-labelledby="profile-details-title"
          className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs"
        >
          <div className="space-y-1 border-b px-5 pt-5 pb-4">
            <h2 id="profile-details-title" className="text-base leading-7 font-semibold tracking-tight">
              Details
            </h2>
            <p className="max-w-[65ch] text-sm leading-6 text-muted-foreground text-pretty">
              Your administrator manages these. Ask them if something needs to change.
            </p>
          </div>
          <dl className="divide-y">
            <DetailRow label="Name">{user.name}</DetailRow>
            <DetailRow label="Email">{user.email}</DetailRow>
            <DetailRow label="Role">
              <RoleBadge role={user.role} />
            </DetailRow>
            <DetailRow label="Specialization">{user.title || "Not set"}</DetailRow>
            <DetailRow label="Directory code">
              <span className="font-mono text-xs">{user.code}</span>
            </DetailRow>
          </dl>
        </section>
      </div>
    </>
  );
}
