"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { type KeyboardEvent, useActionState, useEffect, useRef, useState } from "react";

import { login, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: LoginState = {};
const ERROR_ID = "login-error";

export function LoginForm({ className }: { className?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, initialState);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Start in the email field on pointer devices. Touch screens skip it so a keyboard
  // doesn't cover the page, and focus the visitor has already moved is left alone.
  useEffect(() => {
    const active = document.activeElement;
    const nothingFocused = !active || active === document.body;
    if (nothingFocused && window.matchMedia("(pointer: fine)").matches) emailRef.current?.focus();
  }, []);

  // React resets the form after the action, which clears the password. After a failed
  // attempt, put the caret straight back there.
  useEffect(() => {
    if (state.error) passwordRef.current?.focus();
  }, [state]);

  function syncCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  const invalid = state.error ? true : undefined;
  const describedBy = state.error ? ERROR_ID : undefined;

  return (
    <form
      action={formAction}
      onSubmit={() => setPasswordVisible(false)}
      className={cn("grid gap-5", className)}
    >
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.email}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="h-11 caret-primary"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            required
            aria-invalid={invalid}
            aria-describedby={describedBy}
            onKeyDown={syncCapsLock}
            onKeyUp={syncCapsLock}
            onBlur={() => setCapsLockOn(false)}
            className="h-11 pr-[4.25rem] caret-primary"
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            // Keep the caret in the field when toggling with a pointer.
            onMouseDown={(event) => event.preventDefault()}
            aria-controls="password"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            className="absolute inset-y-1.5 right-1.5 flex w-14 items-center justify-center rounded-[4px] text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {passwordVisible ? "Hide" : "Show"}
          </button>
        </div>
        {capsLockOn && <p className="text-xs text-muted-foreground">Caps Lock is on</p>}
      </div>

      <div id={ERROR_ID} role="alert" className="empty:hidden">
        {state.error ? (
          <p
            className={cn(
              "flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm leading-5 text-destructive",
              // Blank while the next attempt is in flight, so a repeat failure is seen and announced again.
              pending && "invisible",
            )}
          >
            <CircleAlert aria-hidden className="size-4 shrink-0 translate-y-0.5" />
            <span>{state.error}</span>
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 h-11 w-full disabled:opacity-75">
        {pending ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
