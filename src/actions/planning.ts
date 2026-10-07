"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resetGeneratedData } from "@/db/reset";
import { extractPlan, PlanExtractionError } from "@/lib/ai/extract-plan";
import { getCurrentUser } from "@/lib/auth/dal";
import { getDirectory } from "@/lib/data/team";
import { applyPlan } from "@/lib/planning/apply";
import {
  planDraftSchema,
  type DirectoryMember,
  type ImportResult,
  type PlanDraft,
} from "@/lib/planning/types";
import { normalizeDraft, validatePlan } from "@/lib/planning/validate";

const MAX_TRANSCRIPT_CHARS = 60_000;

const transcriptSchema = z
  .string()
  .trim()
  .min(1, "Paste a meeting transcript first.")
  .max(MAX_TRANSCRIPT_CHARS, `Transcripts are limited to ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters.`);

const createInput = z.object({
  transcript: transcriptSchema,
  referenceDate: z.iso.date().optional(),
});

const reviewInput = z.object({
  transcript: transcriptSchema,
  draft: planDraftSchema,
  model: z.string().max(200),
});

/** Admin check from the session — never from anything the client sends. */
async function currentAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

const forbidden: ImportResult = {
  status: "error",
  message: "Only the administrator can create projects from a transcript.",
};

/** Paste → AI draft → validate → save everything (or nothing) in one transaction. */
export async function createFromTranscript(input: {
  transcript: string;
  referenceDate?: string;
}): Promise<ImportResult> {
  const admin = await currentAdmin();
  if (!admin) return forbidden;

  const parsed = createInput.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid transcript." };
  }

  const directory = await getDirectory();
  try {
    const { draft, model } = await extractPlan({
      transcript: parsed.data.transcript,
      directory,
      referenceDate: parsed.data.referenceDate ?? todayInKarachi(),
    });
    return await saveIfValid(admin.id, parsed.data.transcript, draft, model, directory);
  } catch (error) {
    if (error instanceof PlanExtractionError) return { status: "error", message: error.message };
    console.error("[createFromTranscript]", error);
    return { status: "error", message: "Something went wrong, so nothing was created. Please try again." };
  }
}

/** Re-validates an admin-corrected draft (no AI call) and saves it if it is now complete. */
export async function applyReviewedDraft(input: {
  transcript: string;
  draft: PlanDraft;
  model: string;
}): Promise<ImportResult> {
  const admin = await currentAdmin();
  if (!admin) return forbidden;

  const parsed = reviewInput.safeParse(input);
  if (!parsed.success) return { status: "error", message: "The corrected plan could not be read." };

  const { transcript, draft, model } = parsed.data;
  return saveIfValid(admin.id, transcript, draft, `${model} · reviewed`, await getDirectory());
}

async function saveIfValid(
  adminId: string,
  transcript: string,
  draft: PlanDraft,
  model: string,
  directory: DirectoryMember[],
): Promise<ImportResult> {
  draft = normalizeDraft(draft);
  const result = validatePlan(draft, directory);
  if (!result.ok) return { status: "needs_review", draft, issues: result.issues, model };

  try {
    const summary = await applyPlan(result.plan, directory, { transcript, model, createdById: adminId });
    revalidatePath("/", "layout");
    return { status: "applied", summary, model };
  } catch (error) {
    console.error("[applyPlan]", error);
    return { status: "error", message: "Saving failed, so nothing was created. Please try again." };
  }
}

export async function resetDemoData(): Promise<{ ok: boolean; message: string }> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only the administrator can reset demo data." };

  await resetGeneratedData();
  revalidatePath("/", "layout");
  return { ok: true, message: "Generated projects and tasks removed. Demo users were kept." };
}

function todayInKarachi() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
}
