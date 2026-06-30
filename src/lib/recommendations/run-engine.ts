import { buildUserProfile, type BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { filterRecommendations } from "@/lib/recommendations/filter";
import { injectGoalPreferenceBridge } from "@/lib/recommendations/goal-preference-bridge";
import { validatePreGeneration } from "@/lib/recommendations/report-validation";
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
  const scored = scoreAll(filtered, profile);
  const ranked = injectGoalPreferenceBridge(scored, profile, scored);
  const selection = selectActionPlan(ranked, profile);
  const gate = validatePreGeneration({
    answers: input.answers,
    scores: input.scores,
    ranked,
    selection,
    masterRows: config.recommendations,
  });
  if (gate.warnings.length) {
    selection.validationWarnings.push(...gate.warnings);
  }
  if (!gate.ok) {
    throw new Error(`Report pre-generation gate failed: ${gate.errors.join("; ")}`);
  }
  return buildActionPlan({ selection, input, config, llmProvider: opts?.llmProvider });
}

export { buildUserProfile } from "@/lib/recommendations/build-user-profile";
