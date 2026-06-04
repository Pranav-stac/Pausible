import { createHash } from "node:crypto";
import type { ActionPlan } from "@/lib/recommendations/types";
import type { ActionPlanApiResponse } from "@/lib/recommendations/client-types";
import type { AttemptAnswers, AttemptScores } from "@/types/models";

export type StoredActionPlanCache = {
  inputHash: string;
  plan: ActionPlanApiResponse["plan"];
  synthesizedAt?: string;
};

export function hashActionPlanInputs(
  answers: AttemptAnswers,
  scores: AttemptScores | null | undefined,
): string {
  const payload = JSON.stringify({ answers, scores: scores ?? null });
  return createHash("sha256").update(payload).digest("hex");
}

export function toActionPlanApiPayload(plan: ActionPlan): ActionPlanApiResponse["plan"] {
  return {
    profile: plan.profile,
    synthesis: plan.synthesis,
    audit: {
      sourceIds: plan.allSourceIds,
      rankedTop: plan.ranked.slice(0, 15).map((r) => ({
        id: r.id,
        score: r.score.total,
        pillar: r.pillar,
        type: r.type,
      })),
    },
  };
}

export function readStoredActionPlanCache(
  raw: unknown,
  answers: AttemptAnswers,
  scores: AttemptScores | null | undefined,
): StoredActionPlanCache | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const plan = row.plan;
  const inputHash = typeof row.inputHash === "string" ? row.inputHash : "";
  if (!inputHash || !plan || typeof plan !== "object") return null;
  if (inputHash !== hashActionPlanInputs(answers, scores)) return null;
  return {
    inputHash,
    plan: plan as ActionPlanApiResponse["plan"],
    synthesizedAt: typeof row.synthesizedAt === "string" ? row.synthesizedAt : undefined,
  };
}
