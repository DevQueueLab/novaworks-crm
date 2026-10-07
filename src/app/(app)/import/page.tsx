import type { Metadata } from "next";

import { ImportWorkspace } from "@/components/import/import-workspace";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/dal";
import { getDirectory, listRecentImports } from "@/lib/data/team";
import { MODIFIED_SAMPLE_TRANSCRIPT, SAMPLE_TRANSCRIPT } from "@/lib/samples";

export const metadata: Metadata = { title: "Create from transcript" };

export default async function ImportPage() {
  await requireAdmin();
  const [directory, recent] = await Promise.all([getDirectory(), listRecentImports()]);

  return (
    <>
      <PageHeader
        title="Create from transcript"
        description="Paste a meeting transcript. The AI turns the final decisions into projects and tasks, assigns your real team, and saves everything in one go."
      />
      <ImportWorkspace
        directory={directory}
        recent={recent}
        samples={{ original: SAMPLE_TRANSCRIPT, modified: MODIFIED_SAMPLE_TRANSCRIPT }}
      />
    </>
  );
}
