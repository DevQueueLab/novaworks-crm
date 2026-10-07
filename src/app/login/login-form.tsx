"use client";

import { ArrowRight, CircleAlert, KeyRound, Loader2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { login, type LoginState } from "@/actions/auth";
import { RoleBadge, UserAvatar } from "@/components/people";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/db/schema";
import { cn } from "@/lib/utils";

export type DemoAccount = {
  code: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
};

export function LoginForm({
  demoUsers,
  demoPassword,
}: {
  demoUsers: readonly DemoAccount[];
  demoPassword: string;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submitRef = useRef<HTMLButtonElement>(null);

  function fillDemo(account: DemoAccount) {
    setEmail(account.email);
    setPassword(demoPassword);
    submitRef.current?.focus();
  }

  return (
    <div>
      <form action={formAction} className="space-y-4">
        {state.error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Couldn’t sign you in</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@novaworks.example"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={state.error ? true : undefined}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={state.error ? true : undefined}
            className="h-10"
          />
        </div>

        <Button
          ref={submitRef}
          type="submit"
          size="lg"
          className="h-10 w-full shadow-xs"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">Demo accounts</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <KeyRound className="size-3.5" aria-hidden />
          Pick one to fill the form. Password for all:
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
            {demoPassword}
          </code>
        </p>

        <ul className="mt-3 max-h-72 space-y-0.5 overflow-y-auto rounded-xl border bg-muted/40 p-1.5">
          {demoUsers.map((account) => {
            const selected = account.email === email;
            return (
              <li key={account.code}>
                <button
                  type="button"
                  onClick={() => fillDemo(account)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-[background-color,box-shadow] duration-150 outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring active:bg-background/70",
                    selected && "bg-background shadow-xs ring-1 ring-primary/40",
                  )}
                >
                  <UserAvatar name={account.name} code={account.code} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">{account.name}</span>
                      <RoleBadge role={account.role} className="px-1.5 py-0 text-[10px]" />
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{account.email}</span>
                  </span>
                  <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline">
                    {account.code}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
