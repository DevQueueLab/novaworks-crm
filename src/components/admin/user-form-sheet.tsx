"use client";

import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { createUser, updateUser } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserRole } from "@/db/schema";
import type { AdminUser } from "@/lib/data/admin";

import { copyText, Field, FormError, formText, generatePassword, plural, safeAction } from "./form-field";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

const CODE_EXAMPLE: Record<UserRole, string> = { admin: "ADMIN2", manager: "PM04", agent: "DEV07" };
const TITLE_EXAMPLE: Record<UserRole, string> = {
  admin: "Administrator",
  manager: "Web PM",
  agent: "Full-Stack",
};

function RoleSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const match = ROLE_OPTIONS.find((option) => option.value === next);
        if (match) onChange(match.value);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label} hint="At least 8 characters. Share it with them privately.">
      <div className="flex gap-2">
        <Input
          id={id}
          name="password"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          spellCheck={false}
          aria-describedby={`${id}-hint`}
          className="font-mono"
        />
        <Button type="button" variant="outline" onClick={() => onChange(generatePassword())}>
          <RefreshCw />
          Generate
        </Button>
      </div>
    </Field>
  );
}

function SubmitButton({ pending, idle, busy }: { pending: boolean; idle: string; busy: string }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? busy : idle}
    </Button>
  );
}

/* ------------------------------------------------------------------ create */

export function CreateUserSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus />
          Add user
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b p-5 pr-12">
          <SheetTitle>Add user</SheetTitle>
          <SheetDescription>They can sign in right away with the email and password you set here.</SheetDescription>
        </SheetHeader>
        {/* Mounted only while open, so every visit starts with an empty form. */}
        <CreateUserForm onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [role, setRole] = useState<UserRole>("agent");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      name: formText(data, "name"),
      email: formText(data, "email"),
      role,
      title: formText(data, "title"),
      skills: formText(data, "skills"),
      code: formText(data, "code"),
      password,
    };
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => createUser(input));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast.success("User created", {
        description: result.message,
        action: { label: "Copy password", onClick: () => copyText(input.password) },
      });
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <Field id="new-name" label="Full name">
          <Input id="new-name" name="name" required maxLength={100} autoComplete="off" />
        </Field>
        <Field id="new-email" label="Email">
          <Input
            id="new-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            spellCheck={false}
            placeholder="name@novaworks.example"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="new-role" label="Role">
            <RoleSelect id="new-role" value={role} onChange={setRole} />
          </Field>
          <Field id="new-code" label="Code" hint="Leave empty for the next free code.">
            <Input
              id="new-code"
              name="code"
              maxLength={12}
              autoComplete="off"
              spellCheck={false}
              placeholder={CODE_EXAMPLE[role]}
              aria-describedby="new-code-hint"
              className="font-mono uppercase placeholder:normal-case"
            />
          </Field>
        </div>
        <Field id="new-title" label="Specialization">
          <Input id="new-title" name="title" maxLength={60} placeholder={TITLE_EXAMPLE[role]} />
        </Field>
        <Field id="new-skills" label="Skills" hint="Separate with commas. The AI uses these to choose owners.">
          <Input
            id="new-skills"
            name="skills"
            maxLength={600}
            placeholder="React, APIs, Testing"
            aria-describedby="new-skills-hint"
          />
        </Field>
        <PasswordField id="new-password" label="Temporary password" value={password} onChange={setPassword} />
        <FormError message={error} />
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancel
          </Button>
        </SheetClose>
        <SubmitButton pending={pending} idle="Create user" busy="Creating…" />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------- edit */

export function EditUserSheet({
  user,
  isSelf,
  open,
  onOpenChange,
}: {
  user: AdminUser;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b p-5 pr-12">
          <SheetTitle>Edit {user.name}</SheetTitle>
          <SheetDescription>Changes apply the next time they load a page.</SheetDescription>
        </SheetHeader>
        <EditUserForm key={user.id} user={user} isSelf={isSelf} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function roleHint(user: AdminUser, isSelf: boolean) {
  if (isSelf) return "You can't change your own role.";
  if (user.role === "manager" && user.projectCount > 0) {
    return `Manages ${plural(user.projectCount, "project")}. Reassign them before changing the role.`;
  }
  if (user.role === "agent" && user.taskCount > 0) {
    return `Owns ${plural(user.taskCount, "task")}. Reassign them before changing the role.`;
  }
  return undefined;
}

function EditUserForm({ user, isSelf, onDone }: { user: AdminUser; isSelf: boolean; onDone: () => void }) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hint = roleHint(user, isSelf);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      id: user.id,
      name: formText(data, "name"),
      title: formText(data, "title"),
      skills: formText(data, "skills"),
      role,
    };
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => updateUser(input));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast.success(result.message);
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate">{user.email}</dd>
          <dt className="text-muted-foreground">Code</dt>
          <dd className="font-mono">{user.code}</dd>
        </dl>
        <Field id="edit-name" label="Full name">
          <Input id="edit-name" name="name" defaultValue={user.name} required maxLength={100} autoComplete="off" />
        </Field>
        <Field id="edit-role" label="Role" hint={hint}>
          <RoleSelect id="edit-role" value={role} onChange={setRole} disabled={isSelf} />
        </Field>
        <Field id="edit-title" label="Specialization">
          <Input id="edit-title" name="title" defaultValue={user.title} maxLength={60} />
        </Field>
        <Field id="edit-skills" label="Skills" hint="Separate with commas. The AI uses these to choose owners.">
          <Input
            id="edit-skills"
            name="skills"
            defaultValue={user.skills.join(", ")}
            maxLength={600}
            aria-describedby="edit-skills-hint"
          />
        </Field>
        <FormError message={error} />
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancel
          </Button>
        </SheetClose>
        <SubmitButton pending={pending} idle="Save changes" busy="Saving…" />
      </div>
    </form>
  );
}
