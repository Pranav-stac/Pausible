import { resolvePersonaContextText } from "@/lib/recommendations/resolve-persona-context";
import type { RecommendationRow, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

export const PI_CATEGORY = "persona_insights";

export function isPiSeries(row: Pick<RecommendationRow, "category">): boolean {
  return row.category === PI_CATEGORY;
}

export function isActionPlanPoolRow(
  row: Pick<RecommendationRow, "category" | "type" | "scopeClassification" | "userFacingBoundary" | "recommendationRole">,
): boolean {
  if (isPiSeries(row)) return false;
  if (row.type === "safety_guidance") return false;
  if (row.scopeClassification === "safety_professional_referral") return false;
  if (row.userFacingBoundary === "safety_sensitive") return false;
  if (row.recommendationRole === "safety") return false;
  return true;
}

export function personaMatchesRow(
  row: Pick<RecommendationRow, "personaFit">,
  primaryAlias: string,
  secondaryAlias: string,
): boolean {
  const fit = row.personaFit.map((p) => p.toLowerCase());
  return (
    fit.includes("all_personas") ||
    fit.includes(primaryAlias.toLowerCase()) ||
    fit.includes(secondaryAlias.toLowerCase())
  );
}

export function primaryPersonaMatchesRow(
  row: Pick<RecommendationRow, "personaFit">,
  primaryAlias: string,
): boolean {
  const fit = row.personaFit.map((p) => p.toLowerCase());
  const alias = primaryAlias.toLowerCase();
  return fit.includes("all_personas") || fit.includes(alias);
}

export function resolvedText(
  row: ScoredRecommendation,
  profile: UserProfile,
  options?: { topScoring?: boolean },
): string {
  return resolvePersonaContextText(
    row,
    profile.primaryPersonaAlias,
    profile.secondaryPersonaAlias,
    undefined,
    profile.blendStrength,
    options,
  );
}

/** Plan page persona resolution — primary, secondary when blend > 15%; dual context when Strong Influence. */
export function resolvedTextForPlan(
  row: ScoredRecommendation,
  profile: UserProfile,
  secondaryBlendPct?: number,
  options?: { topScoring?: boolean },
): string {
  return resolvePersonaContextText(
    row,
    profile.primaryPersonaAlias,
    profile.secondaryPersonaAlias,
    secondaryBlendPct,
    profile.blendStrength,
    options,
  );
}

export function resolvedTextForAlias(row: ScoredRecommendation, alias: string): string {
  return resolvePersonaContextText(row, alias);
}
