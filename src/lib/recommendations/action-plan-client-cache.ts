import type { StoredActionPlanCache } from "@/lib/recommendations/action-plan-cache";
import { parseReportLlmProvider, type ReportLlmProvider } from "@/lib/recommendations/report-llm-types";

/** Client-side cache is valid only when it matches the active admin LLM provider. */
export function isActionPlanClientCacheValid(
  cache: StoredActionPlanCache | null | undefined,
  reportLlmProvider: ReportLlmProvider,
  forceRegenerate: boolean,
): cache is StoredActionPlanCache {
  if (forceRegenerate || !cache?.plan) return false;
  return parseReportLlmProvider(cache.llmProvider) === reportLlmProvider;
}
