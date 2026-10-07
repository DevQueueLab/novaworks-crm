import type { ReactNode } from "react";

import { MobileNav } from "@/components/app-shell/mobile-nav";
import { SidebarContent } from "@/components/app-shell/sidebar-content";
import type { ShellUser } from "@/components/app-shell/types";
import { requireUser } from "@/lib/auth/dal";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const shellUser: ShellUser = {
    id: user.id,
    code: user.code,
    name: user.name,
    email: user.email,
    role: user.role,
    title: user.title,
    avatarVersion: user.avatarVersion,
  };

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <SidebarContent user={shellUser} />
      </aside>

      <div className="flex min-h-svh flex-col lg:pl-64">
        <MobileNav user={shellUser} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
