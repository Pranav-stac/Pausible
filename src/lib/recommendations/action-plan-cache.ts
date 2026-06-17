import { createHash } from "node:crypto";
import type { ActionPlan, GeminiTokenUsage } from "@/lib/recommendations/types";
import type { ActionPlanApiResponse } from "@/lib/recommendations/client-types";
import {
  DEFAULT_REPORT_LLM_PROVIDER,
  parseReportLlmProvider,
  type ReportLlmProvider,
} from "@/lib/recommendations/report-llm-types";
import { stripUndefinedDeep } from "@/lib/firebase/strip-undefined";
import type { AttemptAnswers, AttemptScores } from "@/types/models";

/** Bump when prompt/context changes so stale cached plans regenerate. */
export const ACTION_PLAN_SYNTHESIS_VERSION = "v5-llm-provider";

export type StoredActionPlanCache = {
  inputHash: string;
  plan: ActionPlanApiResponse["plan"];
  llmProvider?: ReportLlmProvider;
  synthesizedAt?: string;
  tokenUsage?: GeminiTokenUsage | null;
};

function parseTokenUsage(raw: unknown): GeminiTokenUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const model = typeof row.model === "string" ? row.model : "";
  const promptTokens = typeof row.promptTokens === "number" ? row.promptTokens : 0;
  const completionTokens = typeof row.completionTokens === "number" ? row.completionTokens : 0;
  const totalTokens = typeof row.totalTokens === "number" ? row.totalTokens : promptTokens + completionTokens;
  if (!model && totalTokens === 0) return null;
  return { model, promptTokens, completionTokens, totalTokens };
}

export function buildStoredActionPlanCache(
  inputHash: string,
  plan: ActionPlanApiResponse["plan"],
  llmProvider: ReportLlmProvider = DEFAULT_REPORT_LLM_PROVIDER,
): StoredActionPlanCache {
  return stripUndefinedDeep({
    inputHash,
    plan,
    llmProvider,
    synthesizedAt: new Date().toISOString(),
    tokenUsage: plan.audit.tokenUsage ?? plan.synthesis.tokenUsage ?? null,
  });
}

export function hashActionPlanInputs(
  answers: AttemptAnswers,
  scores: AttemptScores | null | undefined,
  llmProvider: ReportLlmProvider = DEFAULT_REPORT_LLM_PROVIDER,
): string {
  const payload = JSON.stringify({
    version: ACTION_PLAN_SYNTHESIS_VERSION,
    llmProvider,
    answers,
    scores: scores ?? null,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function toActionPlanApiPayload(plan: ActionPlan): ActionPlanApiResponse["plan"] {
  return stripUndefinedDeep({
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
      tokenUsage: plan.synthesis.tokenUsage ?? null,
    },
  });
}

export function readStoredActionPlanCache(
  raw: unknown,
  answers: AttemptAnswers,
  scores: AttemptScores | null | undefined,
  opts?: { currentProvider?: ReportLlmProvider },
): StoredActionPlanCache | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const plan = row.plan;
  const inputHash = typeof row.inputHash === "string" ? row.inputHash : "";
  if (!inputHash || !plan || typeof plan !== "object") return null;

  const cachedProvider = parseReportLlmProvider(row.llmProvider);
  if (opts?.currentProvider && opts.currentProvider !== cachedProvider) return null;

  const hashProvider = opts?.currentProvider ?? cachedProvider;
  if (inputHash !== hashActionPlanInputs(answers, scores, hashProvider)) return null;

  return {
    inputHash,
    plan: plan as ActionPlanApiResponse["plan"],
    llmProvider: cachedProvider,
    synthesizedAt: typeof row.synthesizedAt === "string" ? row.synthesizedAt : undefined,
    tokenUsage: parseTokenUsage(row.tokenUsage),
  };
}
