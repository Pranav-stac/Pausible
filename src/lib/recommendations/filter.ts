import { isPiSeries, primaryPersonaMatchesRow } from "@/lib/recommendations/action-pool";
import type { RecommendationRow, UserProfile } from "@/lib/recommendations/types";
import {
  applyContextSelectionSuppression,
  applyElderlyEffortSuppression,
  applyGoalSafetyOverride,
} from "@/lib/recommendations/context-selection-suppression";

const INTENSITY_EXCLUSION_TAGS = new Set([
  "exclude_poor_sleep_high_intensity",
  "exclude_beginner_advanced_training",
  "exclude_high_stress_extreme_diet",
  "exclude_emotional_eating_extreme_restriction",
  "exclude_high_anxiety_overtracking",
]);

/** Hard filter gate — PDA §13. Health/safety + derived guardrails + PI persona gate + age. */
export function filterRecommendations(
  rows: RecommendationRow[],
  profile: UserProfile,
): RecommendationRow[] {
  const activeExclusions = new Set(profile.exclusions.filter((e) => e !== "exclude_none"));
  const isMinor = profile.isMinor || profile.context.includes("age_under_18");

  return rows.filter((row) => {
    if (isPiSeries(row) && !primaryPersonaMatchesRow(row, profile.primaryPersonaAlias)) {
      return false;
    }

    const rowExcludes = row.excludeIf.filter((e) => e !== "exclude_none");
    if (rowExcludes.some((tag) => activeExclusions.has(tag))) return false;

    if (isMinor && rowExcludes.some((tag) => INTENSITY_EXCLUSION_TAGS.has(tag))) {
      return false;
    }

    return true;
  });
}

/** Full deterministic filter pipeline: hard gate + DR19–DR22 + DR18 goal-safety. */
export function filterForProfile(
  rows: RecommendationRow[],
  profile: UserProfile,
): RecommendationRow[] {
  return applyGoalSafetyOverride(
    applyElderlyEffortSuppression(
      applyContextSelectionSuppression(filterRecommendations(rows, profile), profile),
      profile,
    ),
    profile,
  );
}
