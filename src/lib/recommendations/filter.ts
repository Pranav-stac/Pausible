import type { RecommendationRow, UserProfile } from "@/lib/recommendations/types";

/** Hard filter: drop rows whose Exclude If intersects user exclusions (ignore exclude_none). */
export function filterRecommendations(
  rows: RecommendationRow[],
  profile: UserProfile,
): RecommendationRow[] {
  const activeExclusions = new Set(
    profile.exclusions.filter((e) => e !== "exclude_none"),
  );

  return rows.filter((row) => {
    const rowExcludes = row.excludeIf.filter((e) => e !== "exclude_none");
    if (rowExcludes.length === 0) return true;
    return !rowExcludes.some((tag) => activeExclusions.has(tag));
  });
}
