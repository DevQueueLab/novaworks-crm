import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label, control and an optional muted hint, stacked. */
export function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground text-pretty">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="text-pretty">{message}</span>
    </p>
  );
}

const OFFLINE = { ok: false, message: "Could not reach the server. Please try again." } as const;

/** Runs a server action and turns a network failure into a normal error result. */
export async function safeAction<T>(action: () => Promise<T>): Promise<T | typeof OFFLINE> {
  try {
    return await action();
  } catch {
    return OFFLINE;
  }
}

/** String value of a form field ("" when missing). */
export function formText(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Readable random password (no 0/O or 1/l/I look-alikes). */
export function generatePassword(length = 14) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join("");
}

/** Best-effort copy; clipboard access can be blocked outside secure contexts. */
export function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => undefined);
}

export const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
