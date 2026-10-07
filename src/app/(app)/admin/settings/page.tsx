import { FolderKanban, ListChecks, MessagesSquare, Users } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DangerZone } from "@/components/admin/danger-zone";
import { AiSettings, WorkspaceSettings } from "@/components/admin/settings-forms";
import { SettingsSection } from "@/components/admin/settings-section";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { DEFAULT_FALLBACKS, DEFAULT_MODEL_ID } from "@/lib/ai/extract-plan";
import { requireAdmin } from "@/lib/auth/dal";
import { getSystemHealth } from "@/lib/data/admin";
import { getAppSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

const APP_VERSION = "0.1.0";

const savedAt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function HealthRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span aria-hidden className={cn("mr-2 inline-block size-1.5 rounded-full align-middle", ok ? "bg-success" : "bg-destructive")} />
  );
}

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [settings, health] = await Promise.all([getAppSettings(), getSystemHealth()]);

  const env = {
    model: process.env.AI_MODEL?.trim() || null,
    fallbacks: process.env.AI_FALLBACK_MODELS?.trim() || null,
  };
  const keyConfigured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const { database, counts } = health;

  return (
    <>
      <PageHeader
        title="Settings"
        description={
          settings.updatedAt
            ? `Workspace, AI models and system health. Last saved ${savedAt.format(new Date(settings.updatedAt))}.`
            : "Workspace, AI models and system health. Changes apply to everyone right away."
        }
      />

      <div className="max-w-4xl space-y-6">
        <WorkspaceSettings companyName={settings.companyName} />

        <AiSettings
          saved={{ model: settings.aiModel, fallbacks: settings.aiFallbackModels }}
          env={env}
          defaults={{ model: DEFAULT_MODEL_ID, fallbacks: DEFAULT_FALLBACKS }}
          keyConfigured={keyConfigured}
        />

        <SettingsSection
          id="health"
          title="System health"
          description="Checked when this page loads. Refresh to check again."
        >
          <div className="space-y-4">
            {counts && (
              <StatGrid className="shadow-none">
                <StatCard
                  label="Users"
                  value={counts.users}
                  hint={`${counts.activeUsers} active`}
                  icon={Users}
                />
                <StatCard label="Projects" value={counts.projects} icon={FolderKanban} />
                <StatCard label="Tasks" value={counts.tasks} icon={ListChecks} />
                <StatCard label="Messages" value={counts.messages} icon={MessagesSquare} />
              </StatGrid>
            )}
            <dl className="divide-y rounded-lg border">
              <HealthRow label="Database">
                <StatusDot ok={database.ok} />
                {database.ok ? `Reachable · ${database.latencyMs ?? 0} ms` : "Unreachable"}
              </HealthRow>
              <HealthRow label="OpenRouter key">
                <StatusDot ok={keyConfigured} />
                {keyConfigured ? "Configured" : "Missing"}
              </HealthRow>
              <HealthRow label="App version">
                <span className="font-mono text-xs">{APP_VERSION}</span>
              </HealthRow>
              <HealthRow label="Node.js">
                <span className="font-mono text-xs">{process.version}</span>
              </HealthRow>
              <HealthRow label="Environment">{process.env.NODE_ENV === "production" ? "Production" : "Development"}</HealthRow>
            </dl>
          </div>
        </SettingsSection>

        <DangerZone />
      </div>
    </>
  );
}
