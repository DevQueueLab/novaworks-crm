/**
 * `pnpm ai:try [--modified]` — runs the AI extraction + validation on the
 * sample transcript without touching the database, and prints the plan.
 */
import { DEMO_USERS } from "../src/db/demo-users";
import { extractPlan } from "../src/lib/ai/extract-plan";
import { validatePlan } from "../src/lib/planning/validate";
import { MODIFIED_SAMPLE_TRANSCRIPT, SAMPLE_TRANSCRIPT } from "../src/lib/samples";

async function main() {
  const directory = DEMO_USERS.map((u) => ({ ...u, id: u.code }));
  const transcript = process.argv.includes("--modified") ? MODIFIED_SAMPLE_TRANSCRIPT : SAMPLE_TRANSCRIPT;

  const started = Date.now();
  const { draft, model } = await extractPlan({ transcript, directory, referenceDate: "2026-10-07" });
  console.log(`model: ${model} (${((Date.now() - started) / 1000).toFixed(1)}s)`);

  for (const p of draft.projects) {
    const hours = p.tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
    console.log(`\n${p.name} · ${p.clientName} · ${p.managerCode} · due ${p.deadline} · ${hours}h`);
    for (const t of p.tasks) {
      console.log(`  - ${t.title} | ${t.assigneeCode} | ${t.deadline} | ${t.estimatedHours}h`);
    }
  }
  console.log("\nleft out:", draft.excludedScope.join("; ") || "—");
  const result = validatePlan(draft, directory);
  console.log(result.ok ? "\nVALID — ready to save" : result.issues);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
