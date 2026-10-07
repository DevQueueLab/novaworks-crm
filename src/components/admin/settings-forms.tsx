"use client";

import { Activity, CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { testAiConnection, updateSettings, type AiConnectionResult } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { Field, FormError, safeAction } from "./form-field";
import { SettingsSection } from "./settings-section";

/* --------------------------------------------------------------- workspace */

export function WorkspaceSettings({ companyName }: { companyName: string }) {
  const [value, setValue] = useState(companyName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = value.trim() !== companyName;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = value;
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => updateSettings({ companyName: next }));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setValue(next.trim());
      toast.success("Workspace saved");
    });
  }

  return (
    <SettingsSection
      id="workspace"
      title="Workspace"
      description="The organization this CRM belongs to."
      footer={
        <>
          <p className="text-xs text-muted-foreground">Up to 80 characters.</p>
          <Button type="submit" form="workspace-form" size="sm" disabled={!dirty || pending}>
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="workspace-form" onSubmit={onSubmit} className="grid max-w-md gap-4">
        <Field id="company-name" label="Company name">
          <Input
            id="company-name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
            maxLength={80}
            autoComplete="organization"
          />
        </Field>
        <FormError message={error} />
      </form>
    </SettingsSection>
  );
}

/* ---------------------------------------------------------------------- ai */

type Source = "admin" | "env" | "default";

const SOURCE_LABEL: Record<Source, string> = {
  admin: "this setting",
  env: "the environment",
  default: "the built-in default",
};

/** Same precedence as the extractor: admin setting, then env, then default. */
function resolve(value: string, envValue: string | null, fallback: string): { value: string; source: Source } {
  if (value.trim()) return { value: value.trim(), source: "admin" };
  if (envValue) return { value: envValue, source: "env" };
  return { value: fallback, source: "default" };
}

const normalizeList = (raw: string) =>
  raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",");

function Effective({ value, source, envName }: { value: string; source: Source; envName: string }) {
  return (
    <span className="block min-w-0">
      Effective: <code className="font-mono text-[11px] break-all text-foreground">{value.split(",").join(", ")}</code>{" "}
      from {source === "env" ? <code className="font-mono text-[11px]">{envName}</code> : SOURCE_LABEL[source]}.
    </span>
  );
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function ConnectionResult({ result }: { result: AiConnectionResult }) {
  if (!result.ok) {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
      >
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="text-pretty">{result.message}</span>
      </div>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: "Key", value: result.label },
    { label: "Plan", value: result.isFreeTier ? "Free tier" : "Paid credits" },
    {
      label: "Credit remaining",
      value: result.limitRemaining === null ? "No limit set" : usd.format(result.limitRemaining),
    },
    { label: "Used so far", value: usd.format(result.usage) },
  ];

  return (
    <div role="status" className="rounded-lg border">
      <p className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
        <CircleCheck className="size-4 text-success" aria-hidden />
        Connected to OpenRouter
      </p>
      <dl className="grid gap-x-6 gap-y-1.5 px-3 py-2.5 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="truncate font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function AiSettings({
  saved,
  env,
  defaults,
  keyConfigured,
}: {
  saved: { model: string | null; fallbacks: string | null };
  env: { model: string | null; fallbacks: string | null };
  defaults: { model: string; fallbacks: string };
  keyConfigured: boolean;
}) {
  const [model, setModel] = useState(saved.model ?? "");
  const [fallbacks, setFallbacks] = useState(saved.fallbacks ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();
  const [connection, setConnection] = useState<AiConnectionResult | null>(null);

  const effectiveModel = resolve(model, env.model, defaults.model);
  const effectiveFallbacks = resolve(normalizeList(fallbacks), env.fallbacks, defaults.fallbacks);
  const dirty = model.trim() !== (saved.model ?? "") || normalizeList(fallbacks) !== (saved.fallbacks ?? "");
  const hasOverrides = Boolean(model.trim() || normalizeList(fallbacks));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { aiModel: model, aiFallbackModels: fallbacks };
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => updateSettings(input));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setModel(input.aiModel.trim());
      setFallbacks(normalizeList(input.aiFallbackModels).split(",").join(", "));
      toast.success("AI settings saved", { description: "New transcript imports use these models." });
    });
  }

  function testConnection() {
    startTest(async () => {
      const result = await safeAction(() => testAiConnection());
      setConnection(result);
    });
  }

  return (
    <SettingsSection
      id="ai"
      title="AI"
      description={
        <>
          Models for turning transcripts into plans, through OpenRouter. Each value resolves in order: this setting,
          then the <code className="font-mono text-xs">AI_MODEL</code> and{" "}
          <code className="font-mono text-xs">AI_FALLBACK_MODELS</code> environment variables, then the built-in
          default.
        </>
      }
      footer={
        <>
          <p className="text-xs text-muted-foreground">Leave a field empty to fall back to the next source.</p>
          <div className="flex gap-2 sm:justify-end">
            {hasOverrides && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setModel("");
                  setFallbacks("");
                }}
              >
                Clear fields
              </Button>
            )}
            <Button type="submit" form="ai-form" size="sm" disabled={!dirty || pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      }
    >
      <form id="ai-form" onSubmit={onSubmit} className="grid gap-5">
        <Field
          id="ai-model"
          label="Primary model"
          hint={<Effective value={effectiveModel.value} source={effectiveModel.source} envName="AI_MODEL" />}
        >
          <Input
            id="ai-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={env.model ?? defaults.model}
            maxLength={200}
            spellCheck={false}
            autoComplete="off"
            aria-describedby="ai-model-hint"
            className="max-w-xl font-mono text-sm"
          />
        </Field>
        <Field
          id="ai-fallbacks"
          label="Fallback models"
          hint={
            <Effective
              value={effectiveFallbacks.value}
              source={effectiveFallbacks.source}
              envName="AI_FALLBACK_MODELS"
            />
          }
        >
          <Input
            id="ai-fallbacks"
            value={fallbacks}
            onChange={(event) => setFallbacks(event.target.value)}
            placeholder={(env.fallbacks ?? defaults.fallbacks).split(",").join(", ")}
            maxLength={1000}
            spellCheck={false}
            autoComplete="off"
            aria-describedby="ai-fallbacks-hint"
            className="max-w-xl font-mono text-sm"
          />
        </Field>
        <FormError message={error} />
      </form>

      <div className="mt-6 space-y-3 border-t pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">Connection</p>
            <p className={cn("text-sm text-muted-foreground", !keyConfigured && "text-destructive")}>
              {keyConfigured
                ? "An OpenRouter key is set on the server. It is never sent to the browser."
                : "OPENROUTER_API_KEY is not set on the server, so imports will fail."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={testConnection} disabled={testing}>
            {testing ? <Loader2 className="animate-spin" /> : <Activity />}
            {testing ? "Testing…" : "Test connection"}
          </Button>
        </div>
        {connection && <ConnectionResult result={connection} />}
      </div>
    </SettingsSection>
  );
}
