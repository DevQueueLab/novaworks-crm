import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { APICallError, generateText, NoObjectGeneratedError, Output, RetryError } from "ai";
import { z } from "zod";

import { planDraftSchema, type DirectoryMember, type PlanDraft } from "@/lib/planning/types";

import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";

/*
 * Defaults run on OpenRouter's free tier. The primary supports native structured
 * output; the fallbacks are tried by OpenRouter when it is rate-limited or down.
 * Precedence: admin system settings → AI_MODEL / AI_FALLBACK_MODELS → these defaults.
 */
export const DEFAULT_MODEL_ID = "nvidia/nemotron-3-super-120b-a12b:free";
const DEFAULT_MODEL = DEFAULT_MODEL_ID;
export const DEFAULT_FALLBACKS = "nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-31b-it:free";

export class PlanExtractionError extends Error {
  override name = "PlanExtractionError";
}

type ModelOverrides = { model?: string | null; fallbacks?: string | null };

function aiConfig(overrides: ModelOverrides = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new PlanExtractionError("AI is not configured on the server (OPENROUTER_API_KEY is missing).");
  }
  const model = overrides.model?.trim() || process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
  const fallbacks = (overrides.fallbacks?.trim() || process.env.AI_FALLBACK_MODELS?.trim() || DEFAULT_FALLBACKS)
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m && m !== model);
  return { apiKey, model, fallbacks };
}

// Spelled out in the prompt too, so models without native structured output
// still know the exact shape to return.
const outputContract = JSON.stringify(z.toJSONSchema(planDraftSchema));

export async function extractPlan(input: {
  transcript: string;
  directory: DirectoryMember[];
  referenceDate: string;
  models?: ModelOverrides;
}): Promise<{ draft: PlanDraft; model: string }> {
  const { apiKey, model, fallbacks } = aiConfig(input.models);
  const openrouter = createOpenRouter({
    apiKey,
    headers: { "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000", "X-Title": "NovaWorks CRM" },
  });

  try {
    const result = await generateText({
      // OpenRouter tries `models` in order when the primary is down or rate-limited.
      model: openrouter(model, fallbacks.length ? { extraBody: { models: [model, ...fallbacks] } } : {}),
      output: Output.object({
        name: "meeting_plan",
        description: "Projects and tasks agreed in the meeting",
        schema: planDraftSchema,
      }),
      system: `${SYSTEM_PROMPT}\n\nReturn ONLY a JSON object that matches this JSON Schema:\n${outputContract}`,
      prompt: buildUserPrompt(input),
      maxOutputTokens: 12_000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(150_000),
    });
    return { draft: result.output, model: result.response.modelId || model };
  } catch (error) {
    // Some models wrap otherwise-valid JSON in prose or code fences.
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const salvaged = parseLenient(error.text);
      if (salvaged) return { draft: salvaged, model: error.response?.modelId || model };
    }
    console.error("[extractPlan]", error);
    throw toExtractionError(error);
  }
}

function parseLenient(text: string): PlanDraft | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = planDraftSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function toExtractionError(error: unknown): PlanExtractionError {
  if (error instanceof PlanExtractionError) return error;

  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (APICallError.isInstance(cause)) {
    const status = cause.statusCode ?? 0;
    if (status === 401 || status === 403) {
      return new PlanExtractionError("OpenRouter rejected the API key. Check OPENROUTER_API_KEY.");
    }
    if (status === 402) {
      return new PlanExtractionError(
        "The OpenRouter account has no credits for this model. Add credits or switch AI_MODEL to a free model.",
      );
    }
    if (status === 429) {
      return new PlanExtractionError("The AI model is rate-limited right now. Wait a minute and try again.");
    }
    if (status >= 500) {
      return new PlanExtractionError("The AI provider is temporarily unavailable. Please try again.");
    }
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new PlanExtractionError("The AI took too long to respond. Please try again.");
  }
  if (NoObjectGeneratedError.isInstance(error)) {
    return new PlanExtractionError("The AI reply could not be read as a project plan. Please try again.");
  }
  return new PlanExtractionError("The AI could not process this transcript. Please try again.");
}
