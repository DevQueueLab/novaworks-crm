import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import type { ShellUser } from "./types";
import { UserMenu } from "./user-menu";

/**
 * Shared sidebar body: rendered by the server layout on desktop and by the
 * mobile sheet on small screens (where `onNavigate` closes the sheet).
 */
export function SidebarContent({ user, onNavigate }: { user: ShellUser; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Logo onClick={onNavigate} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <SidebarNav role={user.role} onNavigate={onNavigate} />
      </div>
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <UserMenu user={user} />
      </div>
    </div>
  );
}
