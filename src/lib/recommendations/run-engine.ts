import { buildUserProfile, type BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { filterRecommendations } from "@/lib/recommendations/filter";
import { buildActionPlan } from "@/lib/recommendations/gemini-synthesis";
import { loadRecommendationConfig } from "@/lib/recommendations/load-recommendation-config";
import { scoreAll } from "@/lib/recommendations/score";
import { selectActionPlan } from "@/lib/recommendations/select-action-plan";
import type { ActionPlan } from "@/lib/recommendations/types";
import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";

export async function runRecommendationEngine(
  input: BuildProfileInput,
  opts?: { llmProvider?: ReportLlmProvider },
): Promise<ActionPlan> {
  const config = await loadRecommendationConfig();
  const profile = buildUserProfile(input, config);
  const filtered = filterRecommendations(config.recommendations, profile);
  const ranked = scoreAll(filtered, profile);
  const selection = selectActionPlan(ranked, profile);
  return buildActionPlan({ selection, input, config, llmProvider: opts?.llmProvider });
}

export { buildUserProfile } from "@/lib/recommendations/build-user-profile";
