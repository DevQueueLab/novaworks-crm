"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { resetUserPassword, setUserActive } from "@/actions/admin";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminUser } from "@/lib/data/admin";

import { copyText, Field, FormError, generatePassword, safeAction } from "./form-field";

type DialogProps = {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/* ---------------------------------------------------------- reset password */

export function ResetPasswordDialog({ user, open, onOpenChange }: DialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {/* Mounted only while open, so the password never lingers between visits. */}
        <ResetPasswordForm key={user.id} user={user} onDone={() => onOpenChange(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ResetPasswordForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = password;
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => resetUserPassword({ id: user.id, password: next }));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast.success("Password reset", {
        description: result.message,
        action: { label: "Copy password", onClick: () => copyText(next) },
      });
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <AlertDialogHeader>
        <AlertDialogTitle>Reset password for {user.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          They are signed out on every device and need the new password to sign in again.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Field id="reset-password" label="New password" hint="At least 8 characters. Share it with them privately.">
        <div className="flex gap-2">
          <Input
            id="reset-password"
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            spellCheck={false}
            aria-describedby="reset-password-hint"
            className="font-mono"
          />
          <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
            <RefreshCw />
            Generate
          </Button>
        </div>
      </Field>
      <FormError message={error} />
      <AlertDialogFooter>
        <AlertDialogCancel type="button" disabled={pending}>
          Cancel
        </AlertDialogCancel>
        <Button type="submit" disabled={pending || password.length < 8}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

/* ---------------------------------------------------- deactivate/reactivate */

export function UserStatusDialog({ user, open, onOpenChange }: DialogProps) {
  const [pending, startTransition] = useTransition();
  const deactivating = user.deactivatedAt === null;

  function confirm() {
    startTransition(async () => {
      const result = await safeAction(() => setUserActive({ id: user.id, active: !deactivating }));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(deactivating ? "User deactivated" : "User reactivated", { description: result.message });
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? `Deactivate ${user.name}?` : `Reactivate ${user.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? "They are signed out everywhere and can't sign in. Their projects, tasks and messages stay as they are."
              : "They can sign in again with their existing password."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant={deactivating ? "destructive" : "default"} onClick={confirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {deactivating ? "Deactivate" : "Reactivate"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
