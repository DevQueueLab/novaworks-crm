"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Logo } from "./logo";
import { SidebarContent } from "./sidebar-content";
import type { ShellUser } from "./types";
import { UserMenu } from "./user-menu";

export function MobileNav({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-lg sm:px-6 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="-ml-2" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0 sm:max-w-72">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Move between NovaWorks pages and manage your account.
          </SheetDescription>
          <SidebarContent user={user} onNavigate={close} />
        </SheetContent>
      </Sheet>

      <Logo />

      <div className="ml-auto flex items-center">
        <UserMenu user={user} compact />
      </div>
    </header>
  );
}
