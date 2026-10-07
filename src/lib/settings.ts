import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { appSettings } from "@/db/schema";

export type AppSettings = {
  companyName: string;
  aiModel: string | null;
  aiFallbackModels: string | null;
  updatedAt: Date | null;
};

const DEFAULTS: AppSettings = {
  companyName: "NovaWorks Technologies",
  aiModel: null,
  aiFallbackModels: null,
  updatedAt: null,
};

/** Current workspace settings (defaults until an admin saves them). */
export async function getAppSettings(): Promise<AppSettings> {
  const [row] = await db
    .select({
      companyName: appSettings.companyName,
      aiModel: appSettings.aiModel,
      aiFallbackModels: appSettings.aiFallbackModels,
      updatedAt: appSettings.updatedAt,
    })
    .from(appSettings)
    .where(eq(appSettings.id, 1))
    .limit(1);
  return row ?? DEFAULTS;
}
