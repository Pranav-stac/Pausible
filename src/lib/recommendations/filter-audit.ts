import { isPiSeries, primaryPersonaMatchesRow } from "@/lib/recommendations/action-pool";
import type { RecommendationRow, UserProfile } from "@/lib/recommendations/types";

const INTENSITY_EXCLUSION_TAGS = new Set([
  "exclude_poor_sleep_high_intensity",
  "exclude_beginner_advanced_training",
  "exclude_high_stress_extreme_diet",
  "exclude_emotional_eating_extreme_restriction",
  "exclude_high_anxiety_overtracking",
]);

/** Why a master row was excluded by §13 filter (admin audit). */
export function filterExclusionReasons(row: RecommendationRow, profile: UserProfile): string[] {
  const reasons: string[] = [];
  const activeExclusions = new Set(profile.exclusions.filter((e) => e !== "exclude_none"));
  const isMinor = profile.context.includes("age_under_18");

  if (isPiSeries(row) && !primaryPersonaMatchesRow(row, profile.primaryPersonaAlias)) {
    reasons.push(`PI persona gate: not matched to primary (${profile.primaryPersonaAlias})`);
  }

  const rowExcludes = row.excludeIf.filter((e) => e !== "exclude_none");
  for (const tag of rowExcludes) {
    if (activeExclusions.has(tag)) {
      reasons.push(`Health/safety exclusion: ${tag}`);
    }
    if (isMinor && INTENSITY_EXCLUSION_TAGS.has(tag)) {
      reasons.push(`Minor-safe intensity gate: ${tag}`);
    }
  }

  return reasons;
}

export function auditFilterExclusions(
  rows: RecommendationRow[],
  profile: UserProfile,
): { row: RecommendationRow; reasons: string[] }[] {
  const excluded: { row: RecommendationRow; reasons: string[] }[] = [];
  for (const row of rows) {
    const reasons = filterExclusionReasons(row, profile);
    if (reasons.length) excluded.push({ row, reasons });
  }
  return excluded;
}
