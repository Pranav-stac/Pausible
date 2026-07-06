import type { ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

/** Goal-preference bridge recommendation (Master v1.15 FIT037). */
export const GOAL_PREFERENCE_BRIDGE_REC_ID = "FIT037";

/** Safe-return anchor when restriction flags or elderly band apply (PDA v1.2 §38.2 DR12–DR15). */
export const SAFE_RETURN_REC_ID = "FIT046";

const RESTRICTION_EXCLUSIONS = new Set([
  "exclude_medical_condition",
  "exclude_doctor_advised_restriction",
  "exclude_pregnancy_postpartum",
  "exclude_injury",
  "exclude_severe_fatigue",
  "exclude_persistent_pain",
]);

function boostInjected(row: ScoredRecommendation, tag: string, bonus = 40): ScoredRecommendation {
  return {
    ...row,
    score: {
      ...row.score,
      total: row.score.total + bonus,
      matchedContext: row.score.matchedContext.includes(tag)
        ? row.score.matchedContext
        : [...row.score.matchedContext, tag],
    },
  };
}

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

  const boosted = boostInjected(
    { ...bridge, score: { ...bridge.score, goals: bridge.score.goals + 8, strength: 0 } },
    "dr11_goal_preference_bridge",
    50,
  );

  return [...ranked, boosted].sort((a, b) => b.score.total - a.score.total);
}

/** Force-include FIT046 when safety restriction flags or age 55+ band (DR12–DR15). */
export function injectSafeReturnRec(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  allRows: ScoredRecommendation[],
): ScoredRecommendation[] {
  const needsSafeReturn =
    profile.exclusions.some((e) => RESTRICTION_EXCLUSIONS.has(e)) || profile.isElderly65;

  if (!needsSafeReturn) return ranked;

  const safe = allRows.find((r) => r.id === SAFE_RETURN_REC_ID);
  if (!safe || ranked.some((r) => r.id === safe.id)) return ranked;

  return [...ranked, boostInjected(safe, "dr_safe_return_fit046")].sort(
    (a, b) => b.score.total - a.score.total,
  );
}
