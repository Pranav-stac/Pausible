import { resolvePersonaContextText } from "@/lib/recommendations/resolve-persona-context";
import type { RecommendationRow, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

export const PI_CATEGORY = "persona_insights";

export function isPiSeries(row: Pick<RecommendationRow, "category">): boolean {
  return row.category === PI_CATEGORY;
}

export function isActionPlanPoolRow(row: Pick<RecommendationRow, "category" | "type">): boolean {
  return !isPiSeries(row) && row.type !== "safety_guidance";
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

export function resolvedText(row: ScoredRecommendation, profile: UserProfile): string {
  return resolvePersonaContextText(row, profile.primaryPersonaAlias);
}

/** Plan page persona resolution — primary, then secondary when blend > 15%. */
export function resolvedTextForPlan(
  row: ScoredRecommendation,
  profile: UserProfile,
  secondaryBlendPct?: number,
): string {
  return resolvePersonaContextText(
    row,
    profile.primaryPersonaAlias,
    profile.secondaryPersonaAlias,
    secondaryBlendPct,
  );
}

export function resolvedTextForAlias(row: ScoredRecommendation, alias: string): string {
  return resolvePersonaContextText(row, alias);
}
