"use client";

import { Hash, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { createChannel } from "@/actions/channels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CHANNEL_DESCRIPTION_MAX_LENGTH, CHANNEL_NAME_MAX_LENGTH, slugify } from "@/lib/chat";

/** "New channel" row for the channel list, opening a small form in a side sheet. */
export function NewChannelSheet({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const slug = slugify(name);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createChannel({ name, description });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      setName("");
      setDescription("");
      onCreated?.();
      router.push(`/messages/${result.slug}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          New channel
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b p-5 pr-12">
          <SheetTitle>New channel</SheetTitle>
          <SheetDescription>Everyone in the workspace can read and post in it.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Name</Label>
            <div className="relative">
              <Hash
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="channel-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="design-reviews"
                maxLength={CHANNEL_NAME_MAX_LENGTH}
                autoComplete="off"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby="channel-name-hint"
                className="pl-8"
              />
            </div>
            <p id="channel-name-hint" className="text-xs leading-5 text-muted-foreground">
              {slug && slug !== name.trim() ? (
                <>
                  Will be created as <span className="font-medium text-foreground">#{slug}</span>
                </>
              ) : (
                "Lowercase letters, numbers and dashes work best."
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this channel for?"
              maxLength={CHANNEL_DESCRIPTION_MAX_LENGTH}
              rows={3}
              className="min-h-20 resize-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-auto flex justify-end gap-2 border-t pt-4">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending || !slug}>
              {pending ? "Creating…" : "Create channel"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
