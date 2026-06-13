import { primaryPersonaMatchesRow } from "@/lib/recommendations/action-pool";
import type { ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

function intersect(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

/** Slide 10: safety_guidance for primary persona or all_personas when context/barriers/goals trigger. */
export function isSafetyRowTriggered(row: ScoredRecommendation, profile: UserProfile): boolean {
  if (row.type !== "safety_guidance") return false;
  if (!primaryPersonaMatchesRow(row, profile.primaryPersonaAlias)) return false;

  if (intersect(row.contextFit, profile.context).length > 0) return true;
  if (intersect(row.barrierFit, profile.barriers).length > 0) return true;
  if (intersect(row.goalFit, profile.goals).length > 0) return true;

  const activeExclusions = profile.exclusions.filter((e) => e !== "exclude_none");
  if (activeExclusions.some((tag) => row.excludeIf.includes(tag))) return true;

  return row.personaFit.includes("all_personas");
}

export function selectTriggeredSafetyGuidance(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
): ScoredRecommendation[] {
  return ranked.filter((r) => r.type === "safety_guidance" && isSafetyRowTriggered(r, profile));
}
