import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LogoMark } from "@/components/app-shell/logo";
import { DEMO_PASSWORD, DEMO_USERS } from "@/db/demo-users";
import { getCurrentUser } from "@/lib/auth/dal";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Real output from the bundled sample transcript (UrbanCart Website). */
const previewTasks = [
  { title: "Product catalog UI", owner: "Ali Raza", due: "12 Oct", hours: "12h" },
  { title: "Product and cart APIs", owner: "Hamza Shah", due: "14 Oct", hours: "14h" },
  { title: "Demo cart UI", owner: "Ali Raza", due: "15 Oct", hours: "8h" },
];

function BrandPanel() {
  return (
    <aside className="hidden flex-col justify-between gap-12 border-r border-white/5 bg-[oklch(0.19_0.03_280)] p-10 text-white lg:flex xl:p-14">
      <div className="flex items-center gap-3">
        <LogoMark className="size-9" />
        <span className="text-lg font-semibold tracking-tight">NovaWorks</span>
      </div>

      <div className="max-w-lg space-y-10">
        <div className="space-y-4">
          <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
            From meeting to execution.
          </h2>
          <p className="max-w-[46ch] text-base leading-7 text-pretty text-white/70">
            Paste a meeting transcript and NovaWorks drafts the projects, tasks, owners and deadlines, matched to
            your real team and ready to review.
          </p>
        </div>

        <figure className="overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10">
          <figcaption className="flex items-baseline justify-between gap-4 border-b border-white/10 px-4 py-3">
            <span className="text-sm font-medium">UrbanCart Website</span>
            <span className="text-xs text-white/55 tabular-nums">3 tasks, 34h</span>
          </figcaption>
          <ul className="divide-y divide-white/[0.06]">
            {previewTasks.map((task) => (
              <li key={task.title} className="flex items-center gap-4 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-white/90">{task.title}</span>
                  <span className="block truncate text-xs text-white/50">{task.owner}</span>
                </span>
                <span className="w-12 shrink-0 text-right text-xs text-white/60 tabular-nums">{task.due}</span>
                <span className="w-8 shrink-0 text-right text-xs font-medium text-white/85 tabular-nums">
                  {task.hours}
                </span>
              </li>
            ))}
          </ul>
        </figure>
      </div>

      <p className="text-sm text-white/55">Built by DevQueue for Infinity Hack ’26</p>
    </aside>
  );
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  const demoUsers = DEMO_USERS.map(({ code, name, email, role, title }) => ({
    code,
    name,
    email,
    role,
    title,
  }));

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <BrandPanel />

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark />
            <span className="font-semibold tracking-tight">NovaWorks</span>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 space-y-1.5">
              <h1 className="text-2xl leading-8 font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back. Sign in to turn meetings into momentum.
              </p>
            </div>
            <LoginForm demoUsers={demoUsers} demoPassword={DEMO_PASSWORD} />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Accounts are seeded for the demo. There is no signup.
          </p>
        </div>
      </main>
    </div>
  );
}
