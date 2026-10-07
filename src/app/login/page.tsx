import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoMark } from "@/components/app-shell/logo";
import { TranscriptToTask } from "@/components/auth/transcript-to-task";
import { getCurrentUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[0.9375rem] font-semibold tracking-tight">NovaWorks</span>
    </span>
  );
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* The form comes first in the DOM so keyboard and screen reader users reach the task first. */}
      <main className="flex min-w-0 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-5 sm:px-8 lg:justify-end lg:px-10">
          <Wordmark className="lg:hidden" />
          <Link
            href="/"
            className="group -mr-2.5 inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ArrowLeft
              aria-hidden
              className="size-4 transition-transform duration-200 ease-out-expo group-hover:-translate-x-0.5"
            />
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pt-6 pb-16 sm:px-8">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Use the account your admin set up for you.</p>
            <LoginForm className="mt-8" />
          </div>
        </div>
      </main>

      <aside
        aria-labelledby="login-panel-heading"
        className="hidden min-w-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:order-first lg:flex"
      >
        <div className="flex h-16 shrink-0 items-center px-10 xl:px-14">
          <Wordmark />
        </div>

        <div className="flex flex-1 flex-col justify-center px-10 pt-6 pb-16 xl:px-14">
          <h2
            id="login-panel-heading"
            className="max-w-xl text-3xl leading-[1.15] font-semibold tracking-tight xl:text-4xl xl:leading-[1.12]"
          >
            Meeting transcripts become assigned, dated, estimated work.
          </h2>
          <TranscriptToTask className="mt-10 w-full max-w-[30rem]" />
        </div>
      </aside>
    </div>
  );
}
