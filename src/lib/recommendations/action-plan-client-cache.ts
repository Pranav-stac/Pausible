import {
  ACTION_PLAN_SYNTHESIS_VERSION,
  type StoredActionPlanCache,
} from "@/lib/recommendations/action-plan-cache";
import { parseReportLlmProvider, type ReportLlmProvider } from "@/lib/recommendations/report-llm-types";

/** Client-side cache is valid only when version, provider, and plan payload match. */
export function isActionPlanClientCacheValid(
  cache: StoredActionPlanCache | null | undefined,
  reportLlmProvider: ReportLlmProvider,
  forceRegenerate: boolean,
): cache is StoredActionPlanCache {
  if (forceRegenerate || !cache?.plan) return false;
  if ((cache.synthesisVersion ?? "") !== ACTION_PLAN_SYNTHESIS_VERSION) return false;
  return parseReportLlmProvider(cache.llmProvider) === reportLlmProvider;
}
