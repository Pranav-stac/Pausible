import type { ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

/** Goal-preference bridge recommendation (Master v1.13 FIT037). */
export const GOAL_PREFERENCE_BRIDGE_REC_ID = "FIT037";

/** Ensure FIT037 is ranked when DR11 goal-preference bridge applies (§21.14). */
export function injectGoalPreferenceBridge(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  allRows: ScoredRecommendation[],
): ScoredRecommendation[] {
  if (!profile.goalPreferenceBridge) return ranked;

  const bridge = allRows.find((r) => r.id === GOAL_PREFERENCE_BRIDGE_REC_ID);
  if (!bridge) return ranked;
  if (ranked.some((r) => r.id === bridge.id)) return ranked;

  const boosted: ScoredRecommendation = {
    ...bridge,
    score: {
      ...bridge.score,
      total: bridge.score.total + 50,
      goals: bridge.score.goals + 8,
      strength: 0,
      matchedContext:
        bridge.score.matchedContext.length > 0
          ? bridge.score.matchedContext
          : ["dr11_goal_preference_bridge"],
    },
  };

  return [...ranked, boosted].sort((a, b) => b.score.total - a.score.total);
}
