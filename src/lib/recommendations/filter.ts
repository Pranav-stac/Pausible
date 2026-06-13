import { PERSONA_ALIAS_TO_KEY } from "@/lib/recommendations/persona-aliases";
import type { RecommendationRow, UserProfile } from "@/lib/recommendations/types";

const PERSONA_ALIASES = new Set(Object.keys(PERSONA_ALIAS_TO_KEY));

/** Hard filter: drop rows whose Exclude If intersects user exclusions or persona (v2.1 Step 1). */
export function filterRecommendations(
  rows: RecommendationRow[],
  profile: UserProfile,
): RecommendationRow[] {
  const activeExclusions = new Set(
    profile.exclusions.filter((e) => e !== "exclude_none"),
  );
  const userPersonas = new Set([
    profile.primaryPersonaAlias.toLowerCase(),
    profile.secondaryPersonaAlias.toLowerCase(),
  ]);

  return rows.filter((row) => {
    const rowExcludes = row.excludeIf.filter((e) => e !== "exclude_none");
    if (rowExcludes.length === 0) return true;

    if (rowExcludes.some((tag) => activeExclusions.has(tag))) return false;

    const personaExcludes = rowExcludes.filter((tag) => PERSONA_ALIASES.has(tag.toLowerCase()));
    if (personaExcludes.some((tag) => userPersonas.has(tag.toLowerCase()))) return false;

    return true;
  });
}
